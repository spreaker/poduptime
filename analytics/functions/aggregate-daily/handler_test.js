import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { aggregateDaily } from "./handler.js"
import config from "../../conf/config.js";
import { flattenDeep } from "lodash-es";
import { use } from "../../common/fixtures.js";

const expectedMessages = flattenDeep(config.regions.map((region) => {
    return config.endpoints.map((endpoint) => {
        return [
            { type: "daily-endpoint", region: region.id, endpoint: endpoint.id },
        ];
    })
}));

describe('analytics - aggregateDaily', () => {

    const sqs = use('sqs');

    it('should submit jobs for each region and endpoints', async () => {

        await aggregateDaily();

        const calls = sqs.calls(SendMessageBatchCommand);
        assert.equal(calls.length, Math.ceil(expectedMessages.length / 10));

        const actualMessages = flattenDeep(calls.map((call) => {
            return call.args[0].input.Entries.map((entry) => { return JSON.parse(entry.MessageBody) });
        }));

        assert.deepStrictEqual(expectedMessages, actualMessages);
    });

    it('should handle SQS errors', async (t) => {

        const errorLogger = t.mock.method(console, 'error', () => { });
        sqs.rejects('simulated error');

        await aggregateDaily();

        assert.equal(errorLogger.mock.calls.length, Math.ceil(expectedMessages.length / 10));
    });
});