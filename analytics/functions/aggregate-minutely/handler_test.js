import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SendMessageBatchCommand } from "@aws-sdk/client-sqs";
import { aggregateMinutely } from "./handler.js"
import config from "../../conf/config.js";
import { flattenDeep } from "lodash-es";
import { use } from "../../common/fixtures.js";
import { throwsAsync } from '../../common/assert.js'

const expectedMessages = flattenDeep(config.regions.map((region) => {
    return [
        { type: "instant", region: region.id }
    ].concat(
        config.endpoints.map((endpoint) => {
            return [
                { type: "detailed", region: region.id, endpoint: endpoint.id },
                { type: "instant-endpoint", region: region.id, endpoint: endpoint.id },
                { type: "recent-issues", region: region.id, endpoint: endpoint.id },
            ];
        })
    );
}));

describe('analytics - aggregateMinutely', () => {

    const sqs = use('sqs');

    it('should submit jobs for each region and endpoints', async () => {

        await aggregateMinutely();

        const calls = sqs.calls(SendMessageBatchCommand);
        assert.equal(calls.length, Math.ceil(expectedMessages.length / 10));

        const actualMessages = flattenDeep(calls.map((call) => {
            return call.args[0].input.Entries.map((entry) => { return JSON.parse(entry.MessageBody) });
        }));

        assert.deepStrictEqual(expectedMessages, actualMessages);
    });

    it('should throw SQS errors', async (t) => {

        sqs.rejects('simulated error');

        await throwsAsync(aggregateMinutely());
    });
});