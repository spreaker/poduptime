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
}

