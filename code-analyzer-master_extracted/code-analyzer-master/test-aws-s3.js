#!/usr/bin/env node

const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

async function testAwsS3() {
  console.log('🧪 Testing AWS S3 Configuration\n');

  // Check environment variables
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const awsBucketName = process.env.AWS_S3_BUCKET_NAME;

  console.log('📋 Environment Variables Check:');
  console.log(`  AWS_ACCESS_KEY_ID: ${awsAccessKeyId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${awsSecretAccessKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`  AWS_REGION: ${awsRegion || '❌ Missing'}`);
  console.log(`  AWS_S3_BUCKET_NAME: ${awsBucketName || '❌ Missing'}`);

  if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !awsBucketName) {
    console.log('\n❌ Missing required environment variables!');
    console.log('Please run: npm run setup-aws');
    process.exit(1);
  }

  // Initialize S3 client
  const s3Client = new S3Client({
    region: awsRegion,
    endpoint: `https://s3.${awsRegion}.amazonaws.com`,
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });

  try {
    // Test 1: List buckets (verify credentials)
    console.log('\n🔍 Test 1: Verifying AWS credentials...');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResponse = await s3Client.send(listBucketsCommand);
    console.log('✅ AWS credentials are valid');
    console.log(`   Available buckets: ${bucketsResponse.Buckets?.map(b => b.Name).join(', ') || 'None'}`);

    // Test 2: Check if target bucket exists
    console.log('\n🔍 Test 2: Checking target bucket...');
    try {
      const headBucketCommand = new GetObjectCommand({
        Bucket: awsBucketName,
        Key: 'test.txt'
      });
      await s3Client.send(headBucketCommand);
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.name === 'NoSuchBucket') {
        console.log(`❌ Bucket '${awsBucketName}' does not exist or is not accessible`);
        console.log('\n🔧 To create the bucket, run:');
        console.log(`   aws s3 mb s3://${awsBucketName} --region ${awsRegion}`);
        console.log('\n🔧 Or create it manually in the AWS Console');
        process.exit(1);
      }
    }

    // Test 3: Test upload (optional)
    console.log('\n🔍 Test 3: Testing upload capability...');
    const testKey = 'test-upload.txt';
    const testContent = 'This is a test file for repository downloads.';
    
    const uploadCommand = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await s3Client.send(uploadCommand);
    console.log('✅ Upload test successful');

    // Test 4: Test download (optional)
    console.log('\n🔍 Test 4: Testing download capability...');
    const downloadCommand = new GetObjectCommand({
      Bucket: awsBucketName,
      Key: testKey,
    });

    const downloadResponse = await s3Client.send(downloadCommand);
    const downloadedContent = await downloadResponse.Body.transformToString();
    
    if (downloadedContent === testContent) {
      console.log('✅ Download test successful');
    } else {
      console.log('❌ Download test failed - content mismatch');
    }

    // Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    const deleteCommand = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: testKey,
    });
    await s3Client.send(deleteCommand);
    console.log('✅ Test file cleaned up');

    console.log('\n🎉 All AWS S3 tests passed!');
    console.log('Your AWS S3 configuration is ready for repository downloads.');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Connect to Bitbucket');
    console.log('3. Try downloading a repository');

  } catch (error) {
    console.error('\n❌ AWS S3 test failed:', error.message);
    
    if (error.name === 'InvalidAccessKeyId') {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check your AWS Access Key ID');
      console.log('2. Verify the key is active in AWS IAM Console');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check your AWS Secret Access Key');
      console.log('2. Verify the secret key matches the access key');
    } else if (error.name === 'AccessDenied') {
      console.log('\n🔧 Possible solutions:');
      console.log('1. Check IAM permissions for S3 access');
      console.log('2. Verify bucket permissions');
    }
    
    process.exit(1);
  }
}

testAwsS3().catch(console.error);
