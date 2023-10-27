import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { aggregateMinutely } from "./handler.js"
import config from "../../conf/config.js";
import { flattenDeep } from "lodash-es";
import { use } from "../../common/fixtures.js";

const expectedCalls = flattenDeep(config.regions.map((region) => {
    return [
        { type: "instant", region: region.id }
    ].concat(
        config.endpoints.map((endpoint) => {
            return [
                { type: "detailed", region: region.id, endpoint: endpoint.id },
                { type: "instant-endpoint", region: region.id, endpoint: endpoint.id }
            ];
        })
    );
}));

describe('analytics - aggregateMinutely', () => {

    const sqs = use('sqs');

    it('should submit jobs for each region and endpoints', async () => {

        await aggregateMinutely();

        const calls = sqs.calls(SendMessageCommand);

        assert.equal(calls.length, expectedCalls.length);

        calls.forEach((call, index) => {

            const args = call.args;
            const input = args[0].input;

            assert.equal(input.MessageBody, JSON.stringify(expectedCalls[index]));
        })
    });

    it('should handle SQS errors', async (t) => {

        const errorLogger = t.mock.method(console, 'error', () => { });
        sqs.rejects('simulated error');

        await aggregateMinutely();

        assert.equal(errorLogger.mock.calls.length, expectedCalls.length);
    });
});