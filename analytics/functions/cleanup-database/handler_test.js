import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupDatabase } from "./handler.js"
import { formatISO, subDays } from 'date-fns';
import { query } from "../../common/database.js";
const { randomUUID } = await import('node:crypto');
import { use } from "../../common/fixtures.js";

describe('analytics - cleanupDatabase', () => {

    const db = use('db');

    it('should delete old measurements', async () => {

        const measurements = [
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 1, duration: 100
            },
            {
                id: randomUUID(), timestamp: formatISO(subDays(new Date(), 32)), endpoint: "service",
                type: "enclosure", region: "antartica-1", available: 1, duration: 100
            },
        ];

        for (const measurement of measurements) {
            await db.query(`
            INSERT INTO measurements (id, timestamp, endpoint, type, region, available, duration)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
                measurement.id, measurement.timestamp, measurement.endpoint,
                measurement.type, measurement.region, measurement.available, measurement.duration
            ]);
        }

        await cleanupDatabase();

        const rows = (await query("SELECT * FROM measurements")).rows;

        assert.equal(rows.length, 1);
        assert.deepStrictEqual(rows, [measurements[0]]);
    });

    it('should delete old unavailables', async () => {

        const unavailables = [
            {
                id: randomUUID(), timestamp: formatISO(new Date()), endpoint: "service",
                type: "enclosure", region: "antartica-1", details: '{}'
            },
            {
                id: randomUUID(), timestamp: formatISO(subDays(new Date(), 32)), endpoint: "service",
                type: "enclosure", region: "antartica-1", details: '{}'
            },
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

        await cleanupDatabase();

        const rows = (await query("SELECT * FROM unavailables")).rows;

        assert.equal(rows.length, 1);
        assert.deepStrictEqual(rows, [unavailables[0]]);
    });

});