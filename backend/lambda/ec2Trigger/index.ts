import { EC2Client, RunInstancesCommand, _InstanceType } from "@aws-sdk/client-ec2";
import {createIamRole} from './createIamRole';

// const securityGroupId = process.env.SECURITY_GROUP_ID;
const dynamoTableName = process.env.TABLE_NAME;
const bucketName = process.env.BUCKET_NAME;
const awsRegion = process.env.AWS_REGION;
const iamName = process.env.IAM_ROLE;

export const handler = async (event : any) => {
    try {
        console.log("Received event:", JSON.stringify(event, null, 2));
        
        let insertRecord;
        for(const record of event.Records){
            if(record.eventName === 'INSERT'){
                console.log("Processing record:", JSON.stringify(record, null, 2));
                insertRecord = record;
                break;
            }
        }
        if (!insertRecord) {
            console.log("No new records to process");
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "No new records to process" }),
            };
        }
        const tableData = insertRecord.dynamodb.NewImage;
        const {inputText,id,inputFilePath} = tableData;

        console.log("Processing record:", JSON.stringify(tableData, null, 2));

        const userDataScript = `#!/bin/bash
            aws s3 cp s3://${bucketName}/data/processing.sh /tmp/processing.sh
            chmod +x /tmp/processing.sh
            /tmp/processing.sh "${inputFilePath.S}" "${inputText.S}" "${bucketName}" "${dynamoTableName}" "${id.S}" "${awsRegion}" >> /tmp/processing.log 2>&1
            `;
        const userDataEncoded = Buffer.from(userDataScript).toString('base64');

        const ec2Client = new EC2Client({ region: awsRegion});
        
        // const { instanceProfileName } = await createIamRole();

        const command = new RunInstancesCommand({
            ImageId: "ami-0b990d3cfca306617" ,
            InstanceType: "t2.micro",
            MinCount: 1,
            MaxCount: 1,
            UserData: userDataEncoded,
            IamInstanceProfile: {
                Name: iamName,
              },
            InstanceInitiatedShutdownBehavior: "terminate",
          });
        const response = await ec2Client.send(command);
        
        if (!response.Instances) {
            throw new Error("No instances created");
        }
        console.log("EC2 instance created:", response.Instances[0].InstanceId);

        return {
            statusCode: 200,
            body: JSON.stringify({ instanceId: response.Instances[0].InstanceId }),
        }
            
    } catch (error) {
        console.error("Error in EC2 provisioning:", error);
        if (error instanceof Error) {
            throw new Error(`Error in EC2 provisioning: ${error.message}`);
        } else {
            throw error;
        }
    }
};
