import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";
import config from "../../conf/config.js";

const { randomUUID } = await import('node:crypto');

const client = new SQSClient({});

export const kickstart = async function (event, context) {

    for (const endpoint of config.endpoints) {

        let messages = endpoint.services.map((service) => {
            return { Id: randomUUID(), MessageBody: JSON.stringify({ endpoint: endpoint.id, ...service }) }
        });

        await client.send(new SendMessageBatchCommand({
            QueueUrl: process.env.CHECK_QUEUE_URL,
            Entries: messages
        }));
    }
}