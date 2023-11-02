import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import config from "../../conf/config.js";
import { chunk, flattenDeep } from "lodash-es";

const { randomUUID } = await import('node:crypto');

const client = new SQSClient({});

const buildAggregationMessage = function (payload) {
    return { Id: randomUUID(), MessageBody: JSON.stringify(payload) }
}

export const aggregateDaily = async function (event, context) {

    const messages = flattenDeep(config.regions.map((region) => {
        return config.endpoints.map((endpoint) => {
            return [
                { type: "daily-endpoint", region: region.id, endpoint: endpoint.id }
            ];
        });
    })).map(buildAggregationMessage);

    for (const batch of chunk(messages, 10)) {
        await client.send(new SendMessageBatchCommand({
            QueueUrl: process.env.AGGREGATE_QUEUE_URL,
            Entries: batch
        }));
    }
}