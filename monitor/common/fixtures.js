import { beforeEach } from 'node:test';
import { SQSClient } from "@aws-sdk/client-sqs";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { mockClient } from 'aws-sdk-client-mock';

const eventsMock = mockClient(EventBridgeClient);
const sqsMock = mockClient(SQSClient);

const fixtures = {

    events: () => {

        beforeEach(async () => {
            eventsMock.reset();
        });

        return eventsMock;
    },

    sqs: () => {

        beforeEach(async () => {
            sqsMock.reset();
        });

        return sqsMock;
    }
}

export const use = (what) => {
    return fixtures[what]();
};