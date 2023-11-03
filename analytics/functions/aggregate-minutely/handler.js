import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import config from "../../conf/config.js";
import { chunk, flattenDeep } from "lodash-es";

const { randomUUID } = await import('node:crypto');

const client = new SQSClient({});

const buildAggregationMessage = function (payload) {
    return { Id: randomUUID(), MessageBody: JSON.stringify(payload) }
}

export const aggregateMinutely = async function (event, context) {

    const messages = flattenDeep(config.regions.map((region) => {
        return [
            { type: "instant", region: region.id }
        ].concat(config.endpoints.map((endpoint) => {
            return [
                { type: "detailed", region: region.id, endpoint: endpoint.id },
                { type: "instant-endpoint", region: region.id, endpoint: endpoint.id },
                { type: "recent-issues", region: region.id, endpoint: endpoint.id },
            ];
        }));
    })).map(buildAggregationMessage);

    for (const batch of chunk(messages, 10)) {
        await client.send(new SendMessageBatchCommand({
            QueueUrl: process.env.AGGREGATE_QUEUE_URL,
            Entries: batch
        }));
    }
}