import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class BackendStack extends cdk.Stack {
  public readonly uploadBucket: s3.Bucket;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.uploadBucket = new s3.Bucket(this, 'UploadBucket', {
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // Adjust this to match your domain in production
          allowedHeaders: ['*'],
        },
      ],
    });

    const presignedUrlFunction = new lambda.Function(this, 'PresignedUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X, // Choose the appropriate runtime
      handler: 'generate-presigned-url.handler',
      code: lambda.Code.fromAsset('path/to/your/lambda/directory'), // Update with the path to your Lambda function's directory
      environment: {
        BUCKET_NAME: this.uploadBucket.bucketName,
      },
    });

    const api = new apigateway.RestApi(this, 'UploadApi', {
      restApiName: 'Upload Service',
    });

    const upload = api.root.addResource('upload');
    upload.addMethod('GET', new apigateway.LambdaIntegration(presignedUrlFunction));
  }
}


