import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { archiveRaw } from "./handler.js"
import { formatISO, format } from 'date-fns';
import { throwsAsync } from '../../common/assert.js'
import { use } from "../../common/fixtures.js";

describe('analytics - archiveRaw', () => {

    const s3 = use('s3');

    it('should archive success results on S3', async () => {

        const event = { id: "1", timestamp: formatISO(new Date()), available: 1 };

        await archiveRaw({ Records: [{ body: JSON.stringify({ detail: event }) }] });

        const calls = s3.calls(PutObjectCommand);

        assert.equal(calls.length, 1);

        const args = calls[0].args;
        const input = args[0].input;

        assert.deepStrictEqual(input.Body, JSON.stringify(event));
        assert.deepStrictEqual(input.Key, format(Date.parse(event.timestamp),
            `'raw/year='yyyy/'month='MM/'day='dd/'1.json'`
        ));
    });

    it('should throw on S3 errors', async (t) => {

        s3.rejects('simulated error');

        const event = { timestamp: formatISO(new Date()), available: 1 };

        await throwsAsync(archiveRaw({ Records: [{ body: JSON.stringify({ detail: event }) }] }), null);
    });

});