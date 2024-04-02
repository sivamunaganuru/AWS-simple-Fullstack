// Lambda function code (using AWS SDK v3)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    getSignedUrl,
    S3RequestPresigner,
  } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME || '';

exports.handler = async (event,context) => {
  const key = `uploads/${event.requestContext.requestId}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return {
      statusCode: 200,
      body: JSON.stringify({ url, key }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error creating pre-signed URL" }),
    };
  }
};
