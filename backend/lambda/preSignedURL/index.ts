// Lambda function code (using AWS SDK v3)
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
    getSignedUrl,
    S3RequestPresigner,
  } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.BUCKET_NAME || '';

exports.handler = async (event: APIGatewayProxyEvent, context: Context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const key = `uploads/${event.queryStringParameters?.filename}+${Date.now()}`;
    
    console.log(`Generating a pre-signed URL for key: ${key} in bucket: ${bucketName}`);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log(`Generated pre-signed URL: ${url}`);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Adjust according to your security requirements
                "Access-Control-Allow-Credentials": true,
            },
            body: JSON.stringify({ url, key , bucketName}),
        };
    } catch (err) {
        console.error("Error generating pre-signed URL:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error creating pre-signed URL" }),
        };
    }
};
