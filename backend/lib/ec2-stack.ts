import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class SimpleEc2Stack extends cdk.Stack {

  public readonly securityGroup: ec2.SecurityGroup;
  // public readonly keyValuePair: ec2.CfnKeyPair;
  // public readonly ec2Role: iam.Role;
  public readonly vpce: ec2.VpcEndpoint;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const Vpcs = new ec2.Vpc(this, 'simple-instance-1-vpc', {
      maxAzs: 3,
      natGateways: 1,
    });
    
    const ec2Role = new iam.Role(this, 'EC2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        roleName: 'simple-instance-1-role',
    });
      
      // Add policies to the role
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'));
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));
      
    this.securityGroup = new ec2.SecurityGroup(this,
      'simple-instance-1-sg',
      {
        vpc: Vpcs,
        allowAllOutbound: true,
        securityGroupName: 'simple-instance-1-sg',
      }
    )

    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allows SSH access from Internet'
    )

    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allows HTTP access from Internet'
    )

    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allows HTTPS access from Internet'
    )

    // this.keyValuePair = new ec2.CfnKeyPair(this, 'simple-instance-1-key-pair', {
    //   keyName: 'simple-instance-1-key-pair',
    // });

  }
}