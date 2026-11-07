import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface IParkRunCertificateStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  subdomain: string;
}

/**
 * ACM certificate for the CloudFront distribution. CloudFront only accepts certificates
 * from us-east-1, so this small stack lives there while everything else stays in
 * eu-central-1. The main stack consumes the certificate via `crossRegionReferences`.
 */
export class ParkRunCertificateStack extends cdk.Stack {
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: IParkRunCertificateStackProps) {
    super(scope, id, props);

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.domainName
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: `${props.subdomain}.${props.domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM certificate (us-east-1) used by CloudFront'
    });
  }
}
