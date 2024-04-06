import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as S3Deployment from "aws-cdk-lib/aws-s3-deployment";

export class BackendStack extends cdk.Stack {
  public readonly uploadBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['*'], 
          allowedHeaders: ['*'],
        },
      ],
    });
    
    // Uploading ec2Scripts into the above create S3 bucket
    new S3Deployment.BucketDeployment(this, 'DeployFiles', {
      sources: [S3Deployment.Source.asset("ec2Scripts")], 
      destinationBucket: this.uploadBucket,
      destinationKeyPrefix: 'data',
    });

    // DYNAMODB TABLE Stack
    const dynamodbTable = new dynamodb.TableV2(this, 'InputTable', {
      tableName: 'InputTable',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      dynamoStream : dynamodb.StreamViewType.NEW_IMAGE,
      billing: dynamodb.Billing.onDemand()
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'UploadApi', {
      restApiName: 'Upload Service',
    });

    // PRESIGNED S3 URL STACK
    /*
     We need a Presigned URL to upload the users text file into the S3 bucket.
      UI -> API Gateway -> Lambda -> S3 Bucket
    */
    const presignedMetadata = {
      function_name: 'PresignedUrlFunction',
      lambda_path: 'lambda/preSignedURL',
    };

    const presignedUrlFunction = new lambda.Function(this, 'PresignedUrlFunction', {
      functionName: presignedMetadata.function_name,
      runtime: lambda.Runtime.NODEJS_20_X, // Choose the appropriate runtime
      handler: 'index.handler',
      code: lambda.Code.fromAsset(presignedMetadata.lambda_path), // Update with the path to your Lambda function's directory
      environment: {
        BUCKET_NAME: this.uploadBucket.bucketName,
      },
    });

    // lambd function needs S3 PutObject permission to generate the presigned URL
    const presignedUrlFunctionRole = presignedUrlFunction.role;
    if (presignedUrlFunctionRole) {
      presignedUrlFunctionRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [`${this.uploadBucket.bucketArn}/*`],
        })
      )
    }

    // Creating a get route on the above created API Gateway
    const upload = api.root.addResource('upload');
    upload.addMethod('GET', new apigateway.LambdaIntegration(presignedUrlFunction));
    upload.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: [ 'GET', 'OPTIONS'],
    });

     // DYNAMODB UPDATE
     /*
      Once the input file is uploaded into the S3 bucket, user will make an another POST request
      to insert the user data into the dynamodb table.
      UI -> API Gateway -> Lambda -> DynamoDB
     */
     const dynamodbMetadata = {
      function_name: 'DynamoInsertFunction',
      lambda_path: 'lambda/dynamoInsert',
    };

    const dynamoInsertFunction = new lambda.Function(this, 'DynamoInsertFunction', {
      functionName: dynamodbMetadata.function_name,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(dynamodbMetadata.lambda_path),
      environment: {
        TABLE_NAME: dynamodbTable.tableName,
      },
    });

    // Granting the lambda function to write data into the dynamodb table
    dynamodbTable.grantWriteData(dynamoInsertFunction);

    // Creating a POST route on the above created API Gateway for inserting the data into the dynamodb table
    const dynamoInsert = api.root.addResource('dynamoInsert');
    dynamoInsert.addMethod('POST', new apigateway.LambdaIntegration(dynamoInsertFunction));
    dynamoInsert.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: [ 'POST', 'OPTIONS'],
    });

    // EC2 INSTANCE CREATION
    /*
      Once the data is inserted into the dynamodb table, Next step is to create a EC2 instance,
      to trgger a new EC2 instance we need to create a new lambda function that will be triggered
      by the dynamodb table stream event. This lambda will create a new EC2 instance that will fetch the input file
      from the S3 bucket and process it and store the processed file in output S3 bucket. At the same time
      Ec2 should update the dynamodb table with location of the output processed file.
      UI -> API Gateway -> Lambda -> EC2
     */
    const ec2Role = new iam.Role(this, 'EC2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: 'SimpleEC2InstanceProfile',
    });
    
    // Add policies to the role
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));
    // we need instance profile to attach the role to the EC2 instance
    const instanceProfile = new iam.CfnInstanceProfile(this, 'EC2InstanceProfile', {
      roles: [ec2Role.roleName],
    });
    
    // Create a new lambda function that will be triggered by the dynamodb table stream event
    const ec2FunctionMetadata = {
      function_name: 'Ec2Function',
      lambda_path: 'lambda/ec2Trigger',
    };

    const ec2Function = new lambda.Function(this, 'Ec2Function',{
      functionName: ec2FunctionMetadata.function_name,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(ec2FunctionMetadata.lambda_path),
      environment: {
        TABLE_NAME: dynamodbTable.tableName,
        BUCKET_NAME: this.uploadBucket.bucketName,
        IAM_ROLE : instanceProfile.ref,
      },
    });
    
    const ec2Policy = new iam.PolicyStatement({
      actions: [
        "ec2:Describe*",
        "ec2:RunInstances",
        "ec2:CreateInstanceProfile",
        "ec2:AssociateIamInstanceProfile",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:TerminateInstances",
        "ec2:CreateInstance"
      ],
      resources: ['*'],
    });
    
    // Attach the policy to the Lambda function's execution role
    ec2Function.role?.attachInlinePolicy(
      new iam.Policy(this, 'ec2-access-policy', {
        statements: [ec2Policy],
      }),
    );
    const passRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['iam:PassRole'],
      resources: [ec2Role.roleArn], 
      conditions: {
        StringEquals: {
          'iam:PassedToService': 'ec2.amazonaws.com',
        },
      },
    });
    
    // Attach the PassRole policy to the Lambda function's execution role
    ec2Function.role?.attachInlinePolicy(
      new iam.Policy(this, 'PassRolePolicy', {
        statements: [passRolePolicy],
      }),
    );

    ec2Function.addEventSource(new lambdaEventSources.DynamoEventSource(dynamodbTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));

  }
}


