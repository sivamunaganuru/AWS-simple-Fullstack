import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

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

    const function_name = 'PresignedUrlFunction';
    const lambda_path = 'lambda/preSignedURL';

    const presignedUrlFunction = new lambda.Function(this, 'PresignedUrlFunction', {
      functionName: function_name,
      runtime: lambda.Runtime.NODEJS_20_X, // Choose the appropriate runtime
      handler: 'index.handler',
      code: lambda.Code.fromAsset(lambda_path), // Update with the path to your Lambda function's directory
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

    const api = new apigateway.RestApi(this, 'UploadApi', {
      restApiName: 'Upload Service',
    });

    const upload = api.root.addResource('upload');
    upload.addMethod('GET', new apigateway.LambdaIntegration(presignedUrlFunction),
    );

    this.apiEndpoint = new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL for the Upload Service',
    });
  }
}


