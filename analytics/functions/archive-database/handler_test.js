import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { archiveDatabase } from "./handler.js"
import { formatISO } from 'date-fns';
import { throwsAsync } from '../../common/assert.js'
import { queryOne } from "../../common/database.js";
const { randomUUID } = await import('node:crypto');
import { use } from "../../common/fixtures.js";

const SAMPLE_EVENT = {
    id: randomUUID(),
    timestamp: formatISO(new Date()),
    region: "antartica",
    endpoint: "origin",
    url: "https://poduptime.com",
    type: "enclosure",
    status: 200,
    duration: 100,
    headers: {
        "content-type": "text/html; charset=utf-8",
        "content-length": "218",
    },
    traversal: [
        "https://poduptime.com",
        "https://poduptime.com/error"
    ]
}

describe('analytics - archiveDatabase', () => {

    use('db');

    it('should archive successful measurement', async () => {

        const event = { ...SAMPLE_EVENT, available: 1 };

        await archiveDatabase({ Records: [{ body: JSON.stringify({ detail: event }) }] });

        const measurement = await queryOne("SELECT * FROM measurements WHERE id = $1", [event.id]);
        assert.deepStrictEqual(measurement, {
            id: event.id,
            endpoint: event.endpoint,
            type: event.type,
            region: event.region,
            timestamp: event.timestamp,
            available: event.available,
            duration: event.duration
        });

        const unavailable = await queryOne("SELECT * FROM unavailables WHERE id = $1", [event.id]);
        assert.equal(unavailable, null);
    });

    it('should archive unsuccessful measurement', async () => {

        const event = { ...SAMPLE_EVENT, available: 0 };

        await archiveDatabase({ Records: [{ body: JSON.stringify({ detail: event }) }] });

        const measurement = await queryOne("SELECT * FROM measurements WHERE id = $1", [event.id]);
        assert.deepStrictEqual(measurement, {
            id: event.id,
            endpoint: event.endpoint,
            type: event.type,
            region: event.region,
            timestamp: event.timestamp,
            available: event.available,
            duration: event.duration
        });

        const unavailable = await queryOne("SELECT * FROM unavailables WHERE id = $1", [event.id]);
        assert.deepStrictEqual(unavailable, {
            id: event.id,
            endpoint: event.endpoint,
            type: event.type,
            region: event.region,
            timestamp: event.timestamp,
            details: JSON.stringify(event)
        });
    });

    it('should throw on database errors', async (t) => {

        // Missing required fields
        const event = { timestamp: formatISO(new Date()), available: 1 };

        await throwsAsync(archiveDatabase({ Records: [{ body: JSON.stringify({ detail: event }) }] }), null);
    });

});