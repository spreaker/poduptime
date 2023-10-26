import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import config from "../../conf/config.js";

const client = new SQSClient({});

export const aggregateMinutely = async function (event, context) {

    for (const region of config.regions) {
        try {
            await client.send(new SendMessageCommand({
                QueueUrl: process.env.AGGREGATE_QUEUE_URL,
                MessageBody: JSON.stringify({ type: "instant", region: region.id })
            }));
        } catch (err) {
            console.error("Cannot schedule instant aggregation", region.id, err);
        }

        for (const endpoint of config.endpoints) {
            try {
                await client.send(new SendMessageCommand({
                    QueueUrl: process.env.AGGREGATE_QUEUE_URL,
                    MessageBody: JSON.stringify({ type: "detailed", region: region.id, endpoint: endpoint.id })
                }));
            } catch (err) {
                console.error("Cannot schedule detailed aggregation", region.id, endpoint, err);
            }

            try {
                await client.send(new SendMessageCommand({
                    QueueUrl: process.env.AGGREGATE_QUEUE_URL,
                    MessageBody: JSON.stringify({ type: "instant-endpoint", region: region.id, endpoint: endpoint.id })
                }));
            } catch (err) {
                console.error("Cannot schedule instant-endpoint aggregation", region.id, endpoint, err);
            }
        }
    }
}