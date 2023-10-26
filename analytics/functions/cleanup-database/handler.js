import { query } from "../../common/database.js";

export const cleanupDatabase = async function (event, context) {

    /**
     * We want to be able to re-aggregate data up to 30 days ago
     * so we add one extra day of tolerance
     */
    await query(`
        DELETE FROM measurements
        WHERE timestamp < CURRENT_TIMESTAMP - interval '31 days';
    `);
}