import { beforeEach, afterEach } from 'node:test';
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { query, release } from "./database.js";
import { mockClient } from 'aws-sdk-client-mock';
import * as db from "./database.js";

const s3Mock = mockClient(S3Client);
const sqsMock = mockClient(SQSClient);

const fixtures = {

    s3: () => {

        beforeEach(async () => {
            s3Mock.reset();
        });

        return s3Mock;
    },

    sqs: () => {

        beforeEach(async () => {
            sqsMock.reset();
        });

        return sqsMock;
    },

    db: () => {

        beforeEach(async () => {
            await query("BEGIN");
            await query("TRUNCATE measurements");
        });

        afterEach(async () => {
            try {
                await query("ROLLBACK");
            } catch (e) { }
            await release();
        });

        return db;
    }
}

export const use = (what) => {
    return fixtures[what]();
};