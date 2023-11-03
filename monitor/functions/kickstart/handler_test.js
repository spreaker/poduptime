import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { kickstart } from "./handler.js"
import config from "../../conf/config.js";
import { use } from "../../common/fixtures.js";
import { throwsAsync } from '../../common/assert.js'

describe('monitor - kickstart', () => {

    const sqs = use('sqs');

    it('should submit jobs for each endpoint and services', async () => {

        await kickstart();

        const calls = sqs.calls(SendMessageBatchCommand);

        assert.equal(calls.length, config.endpoints.length);

        calls.forEach((call, index) => {

            const args = call.args;
            const endpoint = config.endpoints[index];
            const input = args[0].input;

            assert.equal(input.Entries.length, endpoint.services.length);
            assert.deepStrictEqual(input.Entries.map((e) => {
                return JSON.parse(e.MessageBody);
            }), endpoint.services.map((service) => {
                return { endpoint: endpoint.id, ...service };
            }));
        })
    });

    it('should throw on SQS errors', async (t) => {

        sqs.rejects('simulated error');

        await throwsAsync(kickstart());
    });
});