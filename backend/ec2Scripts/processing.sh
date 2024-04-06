#!/bin/bash

INPUT_FILE_PATH=$1
INPUT_TEXT=$2
BUCKET_NAME=$3
DYNAMO_TABLE_NAME=$4
DYNAMO_ITEM_ID=$5
REGION=$6

echo "Input file path: ${INPUT_FILE_PATH}"
echo "Input text: ${INPUT_TEXT}"
echo "Bucket name: ${BUCKET_NAME}"
echo "DynamoDB table name: ${DYNAMO_TABLE_NAME}"
echo "DynamoDB item ID: ${DYNAMO_ITEM_ID}"
echo "Region: ${REGION}"

# Constants
CURRENT_DATE=$(date +%Y-%m-%d-%H-%M-%S-%3N)
OUTPUT_FILE="OutputFile_${CURRENT_DATE}.txt"
OUTPUT_PATH="output/${OUTPUT_FILE}"

# Ensure AWS CLI is installed
if ! command -v aws &> /dev/null; then
    yum install -y aws-cli
fi

# Set the default region for the AWS CLI
aws configure set default.region $REGION

# Download the input file from S3
aws s3 cp "s3://${INPUT_FILE_PATH}" "/tmp/${OUTPUT_FILE}"

# Append the retrieved input text to the downloaded input file
echo "${INPUT_TEXT}" >> "/tmp/${OUTPUT_FILE}"

# Upload the modified file back to S3
aws s3 cp "/tmp/${OUTPUT_FILE}" "s3://${BUCKET_NAME}/${OUTPUT_PATH}"

# Update the DynamoDB table with the output file path
aws dynamodb update-item --table-name "${DYNAMO_TABLE_NAME}" \
--key "{\"id\": {\"S\": \"${DYNAMO_ITEM_ID}\"}}" \
--update-expression "SET output_file_path = :p" \
--expression-attribute-values "{\":p\":{\"S\":\"${BUCKET_NAME}/${OUTPUT_PATH}\"}}" \
--region $REGION \
--return-values ALL_NEW

# Terminate the instance
sleep 10
sudo shutdown now
