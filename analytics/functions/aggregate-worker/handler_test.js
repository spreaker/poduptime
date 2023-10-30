import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { aggregateWorker } from "./handler.js"
import { throwsAsync } from '../../common/assert.js'
import config from "../../conf/config.js";
import { unionBy, sortBy } from "lodash-es";
import { formatISO, startOfMinute, subMinutes, eachMinuteOfInterval, eachDayOfInterval, subDays, startOfDay } from 'date-fns';
const { randomUUID } = await import('node:crypto');
import { use } from "../../common/fixtures.js";

const assertApiResponse = function (s3, key, expected) {

    const calls = s3.calls(PutObjectCommand);
    assert.equal(calls.length, 1);
    assert.deepStrictEqual(calls[0].args[0].input.Key, key);

    expected = {
        timestamp: /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/, // is an ISO 8601 timestamp
        ...expected,
    }

    const actual = JSON.parse(calls[0].args[0].input.Body);
    assert.match(actual.timestamp, expected.timestamp);
    assert.deepStrictEqual(actual.data, expected.data);
}

describe('analytics - aggregateWorker', () => {

    const db = use('db');
    const s3 = use('s3');

    describe('instant', async () => {

        const measurements = [
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: config.endpoints[0].id,
                type: "enclosure", region: "antartica-1", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: config.endpoints[1].id,
                type: "enclosure", region: "antartica-2", available: 0, duration: 100
            }
        ];

        const backfillInstant = (rows) => {
            return unionBy(rows, config.endpoints.map((endpoint) => {
                return { endpoint: endpoint.id, available: null }
            }), 'endpoint');
        }

        beforeEach(async () => {

            for (const measurement of measurements) {

                await db.query(`
                    INSERT INTO measurements (id, timestamp, endpoint, type, region, available, duration)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    measurement.id, measurement.timestamp, measurement.endpoint,
                    measurement.type, measurement.region, measurement.available, measurement.duration
                ]);
            }
        });

        it('should run the query for specific region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "instant", region: "antartica-1" }) }] });

            assertApiResponse(s3, "api/instant-antartica-1.json", {
                data: backfillInstant([
                    { endpoint: config.endpoints[0].id, available: 1 }
                ])
            });
        });

        it('should run the query for global region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "instant", region: "global" }) }] });

            assertApiResponse(s3, "api/instant-global.json", {
                data: backfillInstant([
                    { endpoint: config.endpoints[0].id, available: 1 },
                    { endpoint: config.endpoints[1].id, available: 0 }
                ])
            });
        });

        it('should throw on S3 errors', async (t) => {

            s3.rejects('simulated error');

            await throwsAsync(aggregateWorker({
                Records: [{
                    body: JSON.stringify({
                        type: "instant", region: "antartica"
                    })
                }]
            }), null);
        });
    });

    describe('instantEndpoint', async () => {

        const endpoint = config.endpoints[0].id;

        const measurements = [
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: endpoint,
                type: config.endpoints[0].services[0].type, region: "antartica-1", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: endpoint,
                type: config.endpoints[0].services[1].type, region: "antartica-2", available: 0, duration: 100
            }
        ];

        const backfillInstantEndpoint = (rows) => {
            return unionBy(rows, config.endpoints[0].services.map((service) => {
                return { type: service.type, available: null }
            }), 'type');
        }

        beforeEach(async () => {

            for (const measurement of measurements) {

                await db.query(`
                    INSERT INTO measurements (id, timestamp, endpoint, type, region, available, duration)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    measurement.id, measurement.timestamp, measurement.endpoint,
                    measurement.type, measurement.region, measurement.available, measurement.duration
                ]);
            }
        });

        it('should run the query for specific region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "instant-endpoint", endpoint: endpoint, region: "antartica-1" }) }] });

            assertApiResponse(s3, `api/instant-${endpoint}-antartica-1.json`, {
                data: backfillInstantEndpoint([
                    { type: config.endpoints[0].services[0].type, available: 1 },
                    { type: config.endpoints[0].services[0].type, available: null }
                ])
            });
        });

        it('should run the query for global region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "instant-endpoint", endpoint: endpoint, region: "global" }) }] });

            assertApiResponse(s3, `api/instant-${endpoint}-global.json`, {
                data: backfillInstantEndpoint([
                    { type: config.endpoints[0].services[0].type, available: 1 },
                    { type: config.endpoints[0].services[1].type, available: 0 }
                ])
            });
        });

        it('should throw on S3 errors', async (t) => {

            s3.rejects('simulated error');

            await throwsAsync(aggregateWorker({
                Records: [{
                    body: JSON.stringify({
                        type: "instant-endpoint", endpoint: endpoint, region: "antartica"
                    })
                }]
            }), null);
        });
    });

    describe('detailed', () => {

        const nowDate = startOfMinute(new Date());
        const now = formatISO(nowDate);
        const prev1m = formatISO(subMinutes(nowDate, 1));
        const prev2m = formatISO(subMinutes(nowDate, 2));
        const intervalMinutes = eachMinuteOfInterval({ start: subMinutes(nowDate, 1439), end: nowDate });

        const measurements = [
            {
                id: randomUUID(), timestamp: prev2m, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: prev2m, endpoint: "service",
                type: "enclosure", region: "antartica-2", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: prev1m, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 0, duration: 100
            },
            {
                id: randomUUID(), timestamp: now, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 0, duration: 100
            }
        ];

        const backfillDetailed = (rows) => {
            return sortBy(unionBy(rows, intervalMinutes.map((minute) => {
                return { timestamp: formatISO(minute), available: null }
            }), 'timestamp'), 'timestamp');
        }

        beforeEach(async () => {

            for (const measurement of measurements) {
                await db.query(`
                INSERT INTO measurements (id, timestamp, endpoint, type, region, available, duration)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                    measurement.id, measurement.timestamp, measurement.endpoint,
                    measurement.type, measurement.region, measurement.available, measurement.duration
                ]);
            }
        });

        it('should run the query for specific region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "detailed", endpoint: "service", region: "antartica-1" }) }] });

            assertApiResponse(s3, "api/detailed-service-antartica-1.json", {
                data: backfillDetailed([
                    { timestamp: prev2m, available: 1 },
                    { timestamp: prev1m, available: 1 },
                    { timestamp: now, available: 0 }
                ])
            });
        });

        it('should run the query for global region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "detailed", endpoint: "service", region: "global" }) }] });

            assertApiResponse(s3, "api/detailed-service-global.json", {
                data: backfillDetailed([
                    { timestamp: prev2m, available: 1 },
                    { timestamp: prev1m, available: 1 },
                    { timestamp: now, available: 0 }
                ])
            });
        });

        it('should throw on S3 errors', async (t) => {

            s3.rejects('simulated error');

            await throwsAsync(aggregateWorker({
                Records: [{
                    body: JSON.stringify({
                        type: "detailed", region: "antartica", endpoint: "service"
                    })
                }]
            }), null);
        });
    });

    describe('recent-issues', () => {

        beforeEach(async () => {

            const unavailables = [
                { id: randomUUID(), timestamp: formatISO(new Date()), endpoint: "service", type: "feed", region: "antartica-1", details: JSON.stringify({ foo: 'bar1' }) },
                { id: randomUUID(), timestamp: formatISO(new Date()), endpoint: "service", type: "feed", region: "antartica-2", details: JSON.stringify({ foo: 'bar2' }) }
            ];

            for (const unavailable of unavailables) {
                await db.query(`
                INSERT INTO unavailables (id, timestamp, endpoint, type, region, details)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                    unavailable.id, unavailable.timestamp, unavailable.endpoint,
                    unavailable.type, unavailable.region, unavailable.details
                ]);
            }
        });

        it('should run the query for global region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "recent-issues", endpoint: "service", region: "global" }) }] });

            assertApiResponse(s3, "api/recent-issues-service-global.json", {
                data: [
                    { foo: 'bar1' },
                    { foo: 'bar2' }
                ]
            });
        });

        it('should run the query for specific region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "recent-issues", endpoint: "service", region: "antartica-1" }) }] });

            assertApiResponse(s3, "api/recent-issues-service-antartica-1.json", {
                data: [
                    { foo: 'bar1' }
                ]
            });
        });

        it('should throw on S3 errors', async (t) => {

            s3.rejects('simulated error');

            await throwsAsync(aggregateWorker({
                Records: [{
                    body: JSON.stringify({
                        type: "recent-issues", region: "antartica", endpoint: "service"
                    })
                }]
            }), null);
        });
    });

    describe('daily-endpoint', () => {

        const todayDate = startOfDay(new Date());
        const today = formatISO(todayDate);
        const yesterdayDate = subDays(todayDate, 1);
        const yesterday = formatISO(yesterdayDate);
        const twoDaysAgo = formatISO(subDays(todayDate, 2));
        const threeDaysAgo = formatISO(subDays(todayDate, 3));
        const intervalDays = eachDayOfInterval({ start: subDays(yesterdayDate, 29), end: yesterdayDate });

        const measurements = [
            {
                id: randomUUID(), timestamp: threeDaysAgo, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: threeDaysAgo, endpoint: "service",
                type: "enclosure", region: "antartica-2", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: twoDaysAgo, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 0, duration: 100
            },
            {
                id: randomUUID(), timestamp: yesterday, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 0, duration: 100
            },
            {
                id: randomUUID(), timestamp: today, endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 0, duration: 100
            }
        ];

        const backfillDaily = (rows) => {
            return sortBy(unionBy(rows, intervalDays.map((day) => {
                return { timestamp: formatISO(day), available: null }
            }), 'timestamp'), 'timestamp');
        }

        beforeEach(async () => {

            for (const measurement of measurements) {
                await db.query(`
                INSERT INTO measurements (id, timestamp, endpoint, type, region, available, duration)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                    measurement.id, measurement.timestamp, measurement.endpoint,
                    measurement.type, measurement.region, measurement.available, measurement.duration
                ]);
            }
        });

        it('should run the query for specific region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "daily-endpoint", endpoint: "service", region: "antartica-1" }) }] });

            assertApiResponse(s3, "api/daily-service-antartica-1.json", {
                data: backfillDaily([
                    { timestamp: threeDaysAgo, available: 1 },
                    { timestamp: twoDaysAgo, available: 1 },
                    { timestamp: yesterday, available: 0 }
                ])
            });
        });

        it('should run the query for global region and upload to S3', async (t) => {

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "daily-endpoint", endpoint: "service", region: "global" }) }] });

            assertApiResponse(s3, "api/daily-service-global.json", {
                data: backfillDaily([
                    { timestamp: threeDaysAgo, available: 1 },
                    { timestamp: twoDaysAgo, available: 1 },
                    { timestamp: yesterday, available: 0 }
                ])
            });
        });

        it('should throw on S3 errors', async (t) => {

            s3.rejects('simulated error');

            await throwsAsync(aggregateWorker({
                Records: [{
                    body: JSON.stringify({
                        type: "daily-endpoint", region: "antartica", endpoint: "service"
                    })
                }]
            }), null);
        });
    });

    describe('unknown', () => {

        it('should throw on unknown aggregation', async (t) => {

            const errorLogger = t.mock.method(console, 'error', () => { });

            await aggregateWorker({ Records: [{ body: JSON.stringify({ type: "unknown" }) }] });

            assert.equal(errorLogger.mock.calls.length, 1);
        });
    });
});