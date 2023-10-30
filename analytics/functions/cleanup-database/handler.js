import { query } from "../../common/database.js";

/*
 * We want to be able to re-aggregate data up to 30 days ago
 * so we add one extra day of tolerance
 */
const RETENTION_DAYS = 31;

export const cleanupDatabase = async function (event, context) {

    await query(`
        DELETE FROM measurements
        WHERE timestamp < CURRENT_TIMESTAMP - interval '${RETENTION_DAYS} days';
    `);

    await query(`
        DELETE FROM unavailables
        WHERE timestamp < CURRENT_TIMESTAMP - interval '${RETENTION_DAYS} days';
    `);
}