import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { format } from 'date-fns';

const client = new S3Client({});

export const archiveRaw = async function (event, context) {

    const result = event.detail ? event.detail : JSON.parse(event.Records[0].body).detail;

    const body = JSON.stringify(result);
    const contentType = "application/json";

    await client.send(new PutObjectCommand({
        Bucket: process.env.DATA_BUCKET,
        Key: format(Date.parse(result.timestamp),
            `'raw/year='yyyy/'month='MM/'day='dd/'${result.id}.json'`
        ),
        Body: body,
        ContentType: contentType
    }));
}
