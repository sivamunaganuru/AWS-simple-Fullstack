import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SimpleEc2Stack } from './ec2-stack';

export class BackendStack extends cdk.Stack {
  public readonly uploadBucket: s3.Bucket;
  public readonly apiEndpoint: cdk.CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.GET],
          allowedOrigins: ['*'], 
          allowedHeaders: ['*'],
        },
      ],
    });
    

    const dynamodbTable = new dynamodb.TableV2(this, 'InputTable', {
      tableName: 'InputTable',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      dynamoStream : dynamodb.StreamViewType.NEW_IMAGE,
      billing: dynamodb.Billing.onDemand()
    });

    // PRESIGNED S3 URL
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

     // DYNAMODB UPDATE
     const dynamodbMetadata = {
      function_name: 'DynamoInsertFunction',
      lambda_path: 'lambda/dynamoInsert',
    };

    const dynamoInsertFunction = new lambda.Function(this, 'DynamoInsertFunction', {
      functionName: dynamodbMetadata.function_name,
      runtime: lambda.Runtime.NODEJS_20_X, // Choose the appropriate runtime
      handler: 'index.handler',
      code: lambda.Code.fromAsset(dynamodbMetadata.lambda_path), // Update with the path to your Lambda function's directory
      environment: {
        TABLE_NAME: dynamodbTable.tableName,
      },
    });
    dynamodbTable.grantWriteData(dynamoInsertFunction);

    const ec2Stack = new SimpleEc2Stack(this, 'SimpleEc2Stack');

    // use a lambda event source to trigger the function when a new record is added to the dynamodb table
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
        SECURITY_GROUP_ID: ec2Stack.securityGroup.securityGroupId,
        // KEY_PAIR_NAME: ec2Stack.keyValuePair.keyName,
        // IMAGE_AMI : ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
        // const subnetId = process.env.SUBNET_ID;
      },
    });

    const ec2Policy = new iam.PolicyStatement({
      actions: [
        "ec2:Describe*",
        "ec2:RunInstances",
        "ec2:CreateKeyPair",
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateTags",
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

    ec2Function.addEventSource(new lambdaEventSources.DynamoEventSource(dynamodbTable, {
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, 'UploadApi', {
      restApiName: 'Upload Service',
    });

    const upload = api.root.addResource('upload');
    upload.addMethod('GET', new apigateway.LambdaIntegration(presignedUrlFunction));

    const dynamoInsert = api.root.addResource('dynamoInsert');
    dynamoInsert.addMethod('POST', new apigateway.LambdaIntegration(dynamoInsertFunction));

    
    upload.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: [ 'GET', 'OPTIONS'],
    });

    dynamoInsert.addCorsPreflight({
      allowOrigins: ['*'],
      allowMethods: [ 'POST', 'OPTIONS'],
    });

    this.apiEndpoint = new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL for the Upload Service',
    });

  }
}


