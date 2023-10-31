import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import config from "../../conf/config.js";
import { find, unionBy, sortBy } from "lodash-es";
import { formatISO, parseISO, startOfMinute, subMinutes, eachMinuteOfInterval, eachDayOfInterval, differenceInMinutes, startOfDay, subDays } from 'date-fns';
import { query } from "../../common/database.js";

const s3Client = new S3Client({});
const MINUTES_IN_A_DAY = 1440;

const aggregateInstant = async function (aggregation) {

    const region = aggregation.region;

    let rows = "global" === region ?
        (await query(`
            WITH windowed_availability AS (
                SELECT timestamp, endpoint, type, region, available,
                LAG(available, 1, 0) OVER (PARTITION BY endpoint, type, region ORDER BY timestamp) AS prevAvailable
                FROM measurements
                WHERE timestamp >= CURRENT_TIMESTAMP - interval '30 minutes'
            )
            SELECT endpoint, AVG(greatest(available, prevAvailable)) as available
            FROM windowed_availability
            GROUP BY 1
        `)).rows :
        (await query(`
            WITH windowed_availability AS (
                SELECT timestamp, endpoint, type, available,
                LAG(available, 1, 0) OVER (PARTITION BY endpoint, type ORDER BY timestamp) AS prevAvailable
                FROM measurements
                WHERE timestamp >= CURRENT_TIMESTAMP - interval '30 minutes' AND region = $1
            )
            SELECT endpoint, AVG(greatest(available, prevAvailable)) as available
            FROM windowed_availability
            GROUP BY 1
        `, [region])).rows;

    let result = unionBy(rows, config.endpoints.map((endpoint) => {
        return { endpoint: endpoint.id, available: null }
    }), 'endpoint');

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.WEBSITE_BUCKET,
        Key: `api/instant-${region}.json`,
        Body: JSON.stringify({ timestamp: formatISO(new Date()), data: result }),
        ContentType: "application/json"
    }));
}

const aggregateInstantEndpoint = async function (aggregation) {

    const region = aggregation.region;
    const endpoint = aggregation.endpoint;
    const endpointConfig = find(config.endpoints, { id: endpoint });
    if (!endpointConfig) {
        console.error("Cannot find endpoint configuration for", aggregation);
        return;
    }

    let rows = "global" === region ?
        (await query(`
            WITH windowed_availability AS (
                SELECT timestamp, type, region, available,
                LAG(available, 1, 0) OVER (PARTITION BY type, region ORDER BY timestamp) AS prevAvailable
                FROM measurements
                WHERE timestamp >= CURRENT_TIMESTAMP - interval '30 minutes'
                AND endpoint = $1
            )
            SELECT type, AVG(greatest(available, prevAvailable)) as available
            FROM windowed_availability
            GROUP BY 1
        `, [endpoint])).rows :
        (await query(`
            WITH windowed_availability AS (
                SELECT timestamp, type, available,
                LAG(available, 1, 0) OVER (PARTITION BY type ORDER BY timestamp) AS prevAvailable
                FROM measurements
                WHERE timestamp >= CURRENT_TIMESTAMP - interval '30 minutes'
                AND endpoint = $1 AND region = $2
            )
            SELECT type, AVG(greatest(available, prevAvailable)) as available
            FROM windowed_availability
            GROUP BY 1
        `, [endpoint, region])).rows;

    let result = unionBy(rows, endpointConfig.services.map((service) => {
        return { type: service.type, available: null }
    }), 'type');

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.WEBSITE_BUCKET,
        Key: `api/instant-${endpoint}-${region}.json`,
        Body: JSON.stringify({ timestamp: formatISO(new Date()), data: result }),
        ContentType: "application/json"
    }));
}

const aggregateDetailed = async function (aggregation) {

    const region = aggregation.region;
    const endpoint = aggregation.endpoint;

    let rows = "global" === region ?
        (await query(`
        WITH windowed_availability AS (
            SELECT timestamp, type, region, available,
            LAG(available, 1, 0) OVER (PARTITION BY type, region ORDER BY timestamp) AS prevAvailable
            FROM measurements
            WHERE timestamp >= CURRENT_TIMESTAMP - interval '${MINUTES_IN_A_DAY + 2} minutes'
            AND endpoint = $1
        )
        SELECT date_trunc('minute', timestamp) as timestamp, AVG(greatest(available, prevAvailable)) as available
        FROM windowed_availability
        GROUP BY 1 ORDER BY 1
    `, [endpoint])).rows :
        (await query(`
        WITH windowed_availability AS (
            SELECT timestamp, type, available,
            LAG(available, 1, 0) OVER (PARTITION BY type ORDER BY timestamp) AS prevAvailable
            FROM measurements
            WHERE timestamp >= CURRENT_TIMESTAMP - interval '${MINUTES_IN_A_DAY + 2} minutes'
            AND endpoint = $1 AND region = $2
        )
        SELECT date_trunc('minute', timestamp) as timestamp, AVG(greatest(available, prevAvailable)) as available
        FROM windowed_availability
        GROUP BY 1 ORDER BY 1
    `, [endpoint, region])).rows;

    /**
     * Backfilling results with defaults and enforcing length
     *
     * - We want to always return MINUTES_IN_A_DAY datapoints
     * - We want to make sure that every minute in the interval is there, without gaps
     * - If the current datapoint is not aggregated yet we want to skip it so we don't
     *   always end the results with an UNKNOWN, but if there's more than one, then we
     *   need them to be shown
     */

    const now = startOfMinute(new Date());
    const mostRecentDatapoint = rows[rows.length - 1] ? parseISO(rows[rows.length - 1].timestamp) : now;
    const endInterval = differenceInMinutes(mostRecentDatapoint, now) <= 1 ? mostRecentDatapoint : now;
    const startInterval = subMinutes(endInterval, MINUTES_IN_A_DAY - 1);
    const intervalMinutes = eachMinuteOfInterval({ start: startInterval, end: endInterval });
    const defaults = intervalMinutes.map((minute) => {
        return { timestamp: formatISO(minute), available: null }
    });

    let result = sortBy(unionBy(rows, defaults, 'timestamp'), 'timestamp').slice(-MINUTES_IN_A_DAY);

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.WEBSITE_BUCKET,
        Key: `api/detailed-${endpoint}-${region}.json`,
        Body: JSON.stringify({ timestamp: formatISO(new Date()), data: result }),
        ContentType: "application/json"
    }));
}

const aggreateRecentIssues = async function (aggregation) {

    const region = aggregation.region;
    const endpoint = aggregation.endpoint;

    let rows = "global" === region ?
        (await query(`
            SELECT details
            FROM unavailables
            WHERE endpoint = $1
            ORDER BY timestamp DESC LIMIT 10
        `, [endpoint])).rows :
        (await query(`
            SELECT details
            FROM unavailables
            WHERE endpoint = $1
            AND region = $2 ORDER BY timestamp DESC LIMIT 10
        `, [endpoint, region])).rows;

    let result = rows.map((row) => JSON.parse(row.details));

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.WEBSITE_BUCKET,
        Key: `api/recent-issues-${endpoint}-${region}.json`,
        Body: JSON.stringify({ timestamp: formatISO(new Date()), data: result }),
        ContentType: "application/json"
    }));
}

const aggreateDailyEndpoint = async function (aggregation) {

    const region = aggregation.region;
    const endpoint = aggregation.endpoint;

    let rows = "global" === region ?
        (await query(`
        WITH windowed_availability AS (
            SELECT timestamp, type, region, available,
            LAG(available, 1, 0) OVER (PARTITION BY type, region ORDER BY timestamp) AS prevAvailable
            FROM measurements
            WHERE timestamp >= date_trunc('day', CURRENT_TIMESTAMP) - interval '30 days'
            AND timestamp < date_trunc('day', CURRENT_TIMESTAMP)
            AND endpoint = $1
        )
        SELECT date_trunc('day', timestamp) as timestamp, AVG(greatest(available, prevAvailable)) as available
        FROM windowed_availability
        GROUP BY 1 ORDER BY 1
    `, [endpoint])).rows :
        (await query(`
        WITH windowed_availability AS (
            SELECT timestamp, type, available,
            LAG(available, 1, 0) OVER (PARTITION BY type ORDER BY timestamp) AS prevAvailable
            FROM measurements
            WHERE timestamp >= date_trunc('day', CURRENT_TIMESTAMP) - interval '30 days'
            AND timestamp < date_trunc('day', CURRENT_TIMESTAMP)
            AND endpoint = $1 AND region = $2
        )
        SELECT date_trunc('day', timestamp) as timestamp, AVG(greatest(available, prevAvailable)) as available
        FROM windowed_availability
        GROUP BY 1 ORDER BY 1
    `, [endpoint, region])).rows;

    /**
     * Backfilling results with defaults and enforcing length
     *
     * - We want to always return 30 datapoints
     * - We want to make sure that every day in the interval is there, without gaps
     */

    const endInterval = subDays(new Date(), 1);
    const startInterval = subDays(endInterval, 29);
    const intervalDays = eachDayOfInterval({ start: startInterval, end: endInterval });
    const defaults = intervalDays.map((day) => {
        return { timestamp: formatISO(day), available: null }
    });

    let result = sortBy(unionBy(rows, defaults, 'timestamp'), 'timestamp').slice(-30);

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.WEBSITE_BUCKET,
        Key: `api/daily-${endpoint}-${region}.json`,
        Body: JSON.stringify({ timestamp: formatISO(new Date()), data: result }),
        ContentType: "application/json"
    }));
}

export const aggregateWorker = async function (event, context) {

    const aggregation = JSON.parse(event.Records[0].body);

    if ("instant" === aggregation.type) {
        await aggregateInstant(aggregation);
    } else if ("detailed" === aggregation.type) {
        await aggregateDetailed(aggregation);
    } else if ("instant-endpoint" === aggregation.type) {
        await aggregateInstantEndpoint(aggregation);
    } else if ("recent-issues" === aggregation.type) {
        await aggreateRecentIssues(aggregation);
    } else if ("daily-endpoint" === aggregation.type) {
        await aggreateDailyEndpoint(aggregation);
    } else {
        console.error("Unknown aggregation", event);
    }
}