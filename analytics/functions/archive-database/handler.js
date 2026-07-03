import { query } from "../../common/database.js";

export const archiveDatabase = async function (event, context) {

    const result = event.detail ? event.detail : JSON.parse(event.Records[0].body).detail;

    /**
     * Insert the measuement into the database. This message can
     * be processed multiple times in case of retries and due to
     * EventBridge at-least-once delivery policy, so in case of
     * conflict we do nothing because it means the measurement
     * is already in there.
     */
    await query(`
        INSERT INTO measurements
        (id, timestamp, endpoint, type, region, available, duration)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
    `, [
        result.id, result.timestamp, result.endpoint,
        result.type, result.region, result.available,
        result.duration
    ]);

    if (result.available < 1) {
        await query(`
            INSERT INTO unavailables
            (id, timestamp, endpoint, type, region, details)
            VALUES
            ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
        `, [
            result.id, result.timestamp, result.endpoint,
            result.type, result.region, JSON.stringify(result)
        ]);
    }

    /**
     * Keep track of the latest known CORS headers for prefix and
     * enclosure services. This is informational only and does not
     * affect availability, so we only care about the latest snapshot.
     */
    if (result.cors) {
        await query(`
            INSERT INTO cors_status
            (endpoint, type, region, timestamp, headers, missing)
            VALUES
            ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (endpoint, type, region)
            DO UPDATE SET timestamp = EXCLUDED.timestamp, headers = EXCLUDED.headers, missing = EXCLUDED.missing
        `, [
            result.endpoint, result.type, result.region,
            result.timestamp, JSON.stringify(result.cors.headers), result.cors.missing
        ]);
    }
}

