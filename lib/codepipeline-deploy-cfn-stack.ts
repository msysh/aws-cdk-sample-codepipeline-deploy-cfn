import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CodepipelineDeployCfnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const {
      partition,
      accountId,
      region,
    } = new cdk.ScopedAws(this);

    const repositoryName = 'test-deploy-cfn';
    const stackName = 'test-deploy-cfn';
    const pipelineName = 'test-deploy-cfn-pipeline';

    // -----------------------------
    // S3 bucket for artifacts
    // -----------------------------
    const artifactBucket = new cdk.aws_s3.Bucket(this, `artifact-bucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -----------------------------
    // CodeCommit repository
    // -----------------------------
    const repository = new cdk.aws_codecommit.Repository(this, 'repository', {
      repositoryName: repositoryName,
    });

    // -----------------------------
    // IAM Role for CodePipeline
    // -----------------------------
    const pipelineRole = new cdk.aws_iam.Role(this, `pipeline-role`, {
      assumedBy: new cdk.aws_iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    // -----------------------------
    // IAM Role & Policy for CodePipeline CFn Action (CreateChangeSet and ExecuteChangeSet)
    // -----------------------------
    const pipelineActionPolicy = new cdk.aws_iam.PolicyDocument({
      statements: [
        new cdk.aws_iam.PolicyStatement({
          effect: cdk.aws_iam.Effect.ALLOW,
          actions:[
            'cloudformation:CreateChangeSet',
            'cloudformation:ExecuteChangeSet'
          ],
          resources: [
            `arn:${partition}:cloudformation:${region}:${accountId}:stack/${stackName}/*`
          ]
        })
      ]
    });
    const pipelineActionRole = new cdk.aws_iam.Role(this, `pipeline-action-role`, {
      assumedBy: new cdk.aws_iam.ArnPrincipal(pipelineRole.roleArn),
      inlinePolicies: {
        'policy': pipelineActionPolicy
      }
    });
    pipelineActionRole.grantAssumeRole(pipelineRole);

    // -----------------------------
    // CodePipeline Artifact for source
    // -----------------------------
    const sourceOutput = new cdk.aws_codepipeline.Artifact('SourceOutput');

    // -----------------------------
    // CodePipeline Actions
    // -----------------------------

    // Source Action
    const sourceAction = new cdk.aws_codepipeline_actions.CodeCommitSourceAction({
      actionName: 'CodeCommit',
      branch: 'main',
      codeBuildCloneOutput: false,
      output: sourceOutput,
      repository: repository,
      variablesNamespace: 'source',
    });

    // Create change set Action
    const createChangeSetAction = new cdk.aws_codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
      actionName: 'CreateChangeSet',
      adminPermissions: true,
      changeSetName: 'cs-#{source.CommitId}',
      stackName: stackName,
      templatePath: sourceOutput.atPath('template.yaml'),
      role: pipelineActionRole,
    });

    // Manual approval Action
    const approvalAction = new cdk.aws_codepipeline_actions.ManualApprovalAction({
      actionName: 'ApproveChangeSet',
    });

    // Execute change set Action
    const executeChangeSetAction = new cdk.aws_codepipeline_actions.CloudFormationExecuteChangeSetAction({
      actionName: 'ExecuteChangeSet',
      changeSetName: 'cs-#{source.CommitId}',
      stackName: stackName,
      role: pipelineActionRole,
    });

    // -----------------------------
    // CodePipline
    // -----------------------------
    new cdk.aws_codepipeline.Pipeline(this, 'pipeline', {
      pipelineName: pipelineName,
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [ sourceAction ],
        },
        {
          stageName: 'ChangeSet',
          actions: [ createChangeSetAction ],
        },
        {
          stageName: 'Approval',
          actions: [ approvalAction ],
        },
        {
          stageName: 'Deploy',
          actions: [ executeChangeSetAction ]
        },
      ],
      role: pipelineRole
    });

    // -----------------------------
    // Outputs
    // -----------------------------
    new cdk.CfnOutput(this, 'output-artifact-bucket', {
      description: 'Bucket Name for Artifact',
      value: artifactBucket.bucketName
    });
    new cdk.CfnOutput(this, 'output-repository-url', {
      description: 'Repository Http URL for CodeCommit',
      value: repository.repositoryCloneUrlHttp
    });
  }
}
