import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import config from "../../conf/config.js";

const client = new SQSClient({});

const scheduleAggregation = async (payload) => {
    try {
        await client.send(new SendMessageCommand({
            QueueUrl: process.env.AGGREGATE_QUEUE_URL,
            MessageBody: JSON.stringify(payload)
        }));
    } catch (err) {
        console.error(`Cannot schedule aggregation`, payload, err);
    }
}

export const aggregateDaily = async function (event, context) {

    for (const region of config.regions) {
        for (const endpoint of config.endpoints) {
            await scheduleAggregation({ type: "daily-endpoint", region: region.id, endpoint: endpoint.id });
        }
    }
}