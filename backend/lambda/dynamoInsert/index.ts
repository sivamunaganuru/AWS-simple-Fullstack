import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({region: process.env.AWS_REGION});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || '';

exports.handler = async (event: APIGatewayProxyEvent, context: Context) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    // const id = Math.random().toString(36).substring(7);
    const { nanoid } = await import('nanoid');
    const id = nanoid(7);
    const {inputText, inputFilePath} = JSON.parse(event.body || "");

    console.log(`Received input text: ${inputText} file path: ${inputFilePath}`);

    const command = new PutCommand({
        TableName: tableName,
        Item: {
            id,
            inputText,
            inputFilePath,
        },
    });

    try {
        const response = await docClient.send(command);
        console.log(`Generated pre-signed URL: ${response}`);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": true,
            },
            body: JSON.stringify({ response }),
        };
    } catch (err) {
        console.error("Failed to insert into DynamoDB:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to insert into DynamoDB" }),
        };
    }
};
