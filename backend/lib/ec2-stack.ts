import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam'; 

export class SimpleEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const defaultVpc = ec2.Vpc.fromLookup(this, 'VPC', { isDefault: true })
    
    const role = new iam.Role(
        this,
        'simple-instance-1-role',
        { assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com') }
      )
      
    const securityGroup = new ec2.SecurityGroup(
      this,
      'simple-instance-1-sg',
      {
        vpc: defaultVpc,
        allowAllOutbound: true,
        securityGroupName: 'simple-instance-1-sg',
      }
    )

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allows SSH access from Internet'
    )

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allows HTTP access from Internet'
    )

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allows HTTPS access from Internet'
    )

    // Finally lets provision our ec2 instance
    const instance = new ec2.Instance(this, 'simple-instance-1', {
      vpc: defaultVpc,
      role: role,
      securityGroup: securityGroup,
      instanceName: 'simple-instance-1',
      instanceType: ec2.InstanceType.of( 
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),

      keyName: 'simple-instance-1-key',
    })


    new cdk.CfnOutput(this, 'simple-instance-1-output', {
      value: instance.instancePublicIp
    })
  }
}