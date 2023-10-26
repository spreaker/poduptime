import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { archiveDatabase } from "./handler.js"
import { formatISO } from 'date-fns';
import { throwsAsync } from '../../common/assert.js'
import { queryOne } from "../../common/database.js";
const { randomUUID } = await import('node:crypto');
import { use } from "../../common/fixtures.js";

describe('archiveDatabase', () => {

    use('db');

    it('should archive measurement', async () => {

        const event = {
            id: randomUUID(),
            endpoint: "origin",
            type: "enclosure",
            region: "antartica",
            timestamp: formatISO(new Date()),
            available: 1,
            duration: 1.5
        };

        await archiveDatabase({ detail: event });

        const row = await queryOne("SELECT * FROM measurements WHERE id = $1", [event.id]);

        assert.deepStrictEqual(row, event);
    });

    it('should throw on database errors', async (t) => {

        // Missing required fields
        const event = { timestamp: formatISO(new Date()), available: 1 };

        await throwsAsync(archiveDatabase({ detail: event }), null);
    });

});