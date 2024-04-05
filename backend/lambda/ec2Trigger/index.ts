import { EC2Client, RunInstancesCommand, _InstanceType } from "@aws-sdk/client-ec2";

const securityGroupId = process.env.SECURITY_GROUP_ID;
// const keyPairName = process.env.KEY_PAIR_NAME;
// const iamRole = process.env.IAM_ROLE;
// const imageId = process.env.IMAGE_AMI;

export const handler = async (event : any) => {
    try {
        const ec2Client = new EC2Client({ region: "us-west-1" });
        
        if (!securityGroupId ) {
            throw new Error("Missing environment variables. Please ensure SECURITY_GROUP_ID is set.");
        }

        const command = new RunInstancesCommand({
            // KeyName: keyPairName,
            SecurityGroupIds: [securityGroupId],
            ImageId: "ami-0b990d3cfca306617" ,
            InstanceType: "t2.micro",
            MinCount: 1,
            MaxCount: 1,
          });
        await ec2Client.send(command);
            
    } catch (error) {
        console.error("Error in EC2 provisioning:", error);
        if (error instanceof Error) { // Type guard to check if error is an instance of Error
            throw new Error(`Error in EC2 provisioning: ${error.message}`);
        } else {
            throw error; // Re-throw if we can't handle the error
        }
    }
};
