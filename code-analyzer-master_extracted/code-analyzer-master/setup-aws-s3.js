#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 AWS S3 Setup for Repository Downloads\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found!');
  console.log('Please create .env.local file first with your Bitbucket OAuth credentials.');
  console.log('You can copy from env.example and fill in the Bitbucket credentials.');
  process.exit(1);
}

// Read existing .env.local
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if AWS variables already exist
const hasAwsVars = envContent.includes('AWS_ACCESS_KEY_ID') || 
                   envContent.includes('AWS_SECRET_ACCESS_KEY') || 
                   envContent.includes('AWS_REGION') || 
                   envContent.includes('AWS_S3_BUCKET_NAME');

if (hasAwsVars) {
  console.log('⚠️  AWS S3 variables already exist in .env.local');
  console.log('Current AWS configuration:');
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('AWS_') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key === 'AWS_SECRET_ACCESS_KEY') {
        console.log(`  ${key}=${value ? '***configured***' : 'NOT SET'}`);
      } else {
        console.log(`  ${key}=${value || 'NOT SET'}`);
      }
    }
  });
  
  rl.question('\nDo you want to update AWS S3 configuration? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupAwsVars();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupAwsVars();
}

function setupAwsVars() {
  console.log('\n📝 AWS S3 Configuration Setup\n');
  
  rl.question('AWS Access Key ID: ', (accessKeyId) => {
    if (!accessKeyId.trim()) {
      console.log('❌ Access Key ID is required!');
      rl.close();
      return;
    }
    
    rl.question('AWS Secret Access Key: ', (secretAccessKey) => {
      if (!secretAccessKey.trim()) {
        console.log('❌ Secret Access Key is required!');
        rl.close();
        return;
      }
      
      rl.question('AWS Region (default: us-east-1): ', (region) => {
        const awsRegion = region.trim() || 'us-east-1';
        
        rl.question('S3 Bucket Name: ', (bucketName) => {
          if (!bucketName.trim()) {
            console.log('❌ S3 Bucket Name is required!');
            rl.close();
            return;
          }
          
          // Update or add AWS variables
          updateEnvFile(accessKeyId, secretAccessKey, awsRegion, bucketName);
        });
      });
    });
  });
}

function updateEnvFile(accessKeyId, secretAccessKey, region, bucketName) {
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Remove existing AWS variables if they exist
  const lines = envContent.split('\n');
  const filteredLines = lines.filter(line => 
    !line.startsWith('AWS_ACCESS_KEY_ID=') &&
    !line.startsWith('AWS_SECRET_ACCESS_KEY=') &&
    !line.startsWith('AWS_REGION=') &&
    !line.startsWith('AWS_S3_BUCKET_NAME=')
  );
  
  // Add AWS S3 configuration
  const awsConfig = [
    '',
    '# AWS S3 Configuration (for repository downloads)',
    '# Get these from AWS IAM Console',
    '',
    `AWS_ACCESS_KEY_ID=${accessKeyId}`,
    `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`,
    `AWS_REGION=${region}`,
    `AWS_S3_BUCKET_NAME=${bucketName}`
  ];
  
  const updatedContent = [...filteredLines, ...awsConfig].join('\n');
  
  // Write back to .env.local
  fs.writeFileSync(envPath, updatedContent);
  
  console.log('\n✅ AWS S3 configuration updated successfully!');
  console.log('\n📋 Configuration Summary:');
  console.log(`  • Access Key ID: ${accessKeyId}`);
  console.log(`  • Secret Access Key: ***configured***`);
  console.log(`  • Region: ${region}`);
  console.log(`  • S3 Bucket: ${bucketName}`);
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Create the S3 bucket if it doesn\'t exist:');
  console.log(`   aws s3 mb s3://${bucketName}`);
  console.log('');
  console.log('2. Configure CORS for the bucket (see AWS_S3_INTEGRATION.md)');
  console.log('');
  console.log('3. Set up IAM permissions (see AWS_S3_INTEGRATION.md)');
  console.log('');
  console.log('4. Restart your development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('5. Test the download functionality');
  
  rl.close();
}

rl.on('close', () => {
  process.exit(0);
});
