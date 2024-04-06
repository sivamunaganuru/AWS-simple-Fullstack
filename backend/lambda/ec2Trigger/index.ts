import { EC2Client, RunInstancesCommand, _InstanceType } from "@aws-sdk/client-ec2";

const securityGroupId = process.env.SECURITY_GROUP_ID;
// const keyPairName = process.env.KEY_PAIR_NAME;
// const iamRole = process.env.IAM_ROLE;
// const imageId = process.env.IMAGE_AMI;
const dynamoTableName = process.env.TABLE_NAME;
const bucketName = process.env.BUCKET_NAME;
const awsRegion = process.env.AWS_REGION;

export const handler = async (event : any) => {
    try {
        const tableData = event.Records[0].dynamodb.NewImage;
        const {inputText,id,inputFilePath} = tableData;
        const userDataScript = `
            #!/bin/bash
            aws s3 cp s3://${bucketName}/data/ec2Scripts/processing.sh /tmp/processing.sh
            chmod +x /tmp/processing.sh
            /tmp/processing.sh "${inputFilePath.S}" "${inputText.S}" "${bucketName}" "${dynamoTableName}" "${id.S}" "${awsRegion}" >> /tmp/processing.log 2>&1

            `;
        
        const userDataEncoded = Buffer.from(userDataScript).toString('base64');

        const ec2Client = new EC2Client({ region: "us-west-1" });
        
        if (!securityGroupId ) {
            throw new Error("Missing environment variables. Please ensure SECURITY_GROUP_ID is set.");
        }

        const command = new RunInstancesCommand({
            // KeyName: keyPairName,
            // SecurityGroupIds: [securityGroupId],
            ImageId: "ami-0b990d3cfca306617" ,
            InstanceType: "t2.micro",
            MinCount: 1,
            MaxCount: 1,
            UserData: userDataEncoded,
          });
        const response =   await ec2Client.send(command);
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
        if (error instanceof Error) { // Type guard to check if error is an instance of Error
            throw new Error(`Error in EC2 provisioning: ${error.message}`);
        } else {
            throw error; // Re-throw if we can't handle the error
        }
    }
};