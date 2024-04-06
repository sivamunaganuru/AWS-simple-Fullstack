// createIamRole.ts
import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, CreateInstanceProfileCommand, AddRoleToInstanceProfileCommand } from "@aws-sdk/client-iam";

export const createIamRole = async () => {
    const iamClient = new IAMClient({ region: "us-west-1" });

    const roleName = "MyEC2Role";
    const trustPolicy = {
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com"
        },
        Action: "sts:AssumeRole"
      }]
    };

    // Create the IAM role
    const createRoleResponse = await iamClient.send(new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
      Description: "Role that allows EC2 instances to access S3, DynamoDB, and Lambda",
      }));

    if (!createRoleResponse.Role) {
      throw new Error("Role not created");
    }
    const roleArn = createRoleResponse.Role.Arn;

    // Attach policies to the IAM role
    await iamClient.send(new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess" // Repeat this for other policies
    }));

    await iamClient.send(new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
    }));

    await iamClient.send(new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
    }));

    // Create an instance profile for the IAM role
    const createInstanceProfileResponse = await iamClient.send(new CreateInstanceProfileCommand({
      InstanceProfileName: roleName,
    }));

    // Add the IAM role to the instance profile
    await iamClient.send(new AddRoleToInstanceProfileCommand({
      InstanceProfileName: roleName,
      RoleName: roleName,
    }));


    if (!createInstanceProfileResponse.InstanceProfile) {
      throw new Error("Instance profile not created");
    }


    return {
      roleArn: createRoleResponse.Role.Arn,
      instanceProfileName: createInstanceProfileResponse.InstanceProfile.InstanceProfileName
    };
};
