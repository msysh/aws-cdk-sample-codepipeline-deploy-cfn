# CloudFormation deployment pipeline sample

This project is a sample that deploying CloudFormation template using CodePipeline. Summary of pipeline is following:

1. Push a CloudFormation template to CodeCommit repository.
2. The pipeline create a CloudFormation Change Set.
3. The pipeline require Manual Approval.
4. Finally, the pipeline execute the CloudFormation Change Set.

## How to setup

### 1. Clone this repository

```sh
git clone https://github.com/msysh/aws-cdk-sample-codepipeline-deploy-cfn
```

### 2. Change directory

```sh
cd aws-cdk-sample-codepipeline-deploy-cfn
```

### 3. Deploy pipeline using CDK

```sh
cdk deploy
```

At complete deployment, you can get CodeCommit repository URL from Output.

### 4. Clone CodeCommit repository for CFn template

```sh
cd (any directory)
git clone (CodeCommmit Repository URL you got at Step.3)
```

### 5. Create CFn template

You must specify CloudFormation template file name is `template.yml`. The name is hardcoded in cdk at [here](./lib/codepipeline-deploy-cfn-stack.ts#L89)

For example, if you want to deploy simple S3 bucket, a template is following:

```yaml
AWSTemplateFormatVersion: 2010-09-09
Resources:
  S3Bucket:
    Type: 'AWS::S3::Bucket'
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: True
        BlockPublicPolicy: True
        IgnorePublicAcls: True
        RestrictPublicBuckets: True
Outputs:
  S3BucketName:
    Value: !Ref S3Bucket
```

### 6. Push to CodeCommit repository

```sh
cd (cloned CodeCommit repository)
git add template.yaml
git commit -m "first commit"
git push origin main
```

You must specify CloudFormation template file name is `template.yml`. The name is hardcoded in cdk at [here](./lib/codepipeline-deploy-cfn-stack.ts#L89)

### 7. Approve Change Set

After Change Set is created, then the pipeline wait for approval. If you approve the Change Set, AWS resoureces in the template will be deployed!

### 8. Update template

If you want, you can update the CFn template and push it to the repository.

## Clean up

First, you must remove artifacts files in artifacts S3 bucket. The S3 bucket name is you have got at [Step.3](#3-deploy-aws-resources-by-cdk).

And then execute following command at this project directory:

```
cdk destroy
```

Finally, if you want, delete the directory for CloudFormation template repository which you have cloned at [Step.4](#4-clone-codecommit-repository-for-cfn-template).
