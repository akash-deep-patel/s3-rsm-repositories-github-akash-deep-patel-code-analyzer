# AWS S3 Integration for Repository Downloads

## Overview

This document outlines the implementation for migrating repository downloads from Bitbucket's direct ZIP download to AWS S3 for better reliability and performance.

## Problem Statement

The current Bitbucket ZIP download approach fails with "Cannot resolve the cset" error because:
1. Bitbucket requires proper authentication
2. Branch specification is required
3. Direct ZIP downloads are unreliable for large repositories
4. No progress tracking or error handling

## AWS S3 Solution

### Architecture

```
User clicks "Download ZIP" 
    ↓
Frontend calls /api/download-repo
    ↓
Backend clones repository to temp location
    ↓
Creates ZIP file
    ↓
Uploads to AWS S3
    ↓
Returns presigned download URL
    ↓
User downloads from S3
```

### Implementation Steps

#### 1. Install AWS SDK

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

#### 2. Environment Variables Setup

**Option A: Automated Setup (Recommended)**
```bash
npm run setup-aws
```

This interactive script will:
- Check your existing `.env.local` file
- Prompt for AWS credentials
- Automatically update your environment variables
- Provide next steps for S3 bucket setup

**Option B: Manual Setup**

Add to `.env.local`:

```env
# AWS S3 Configuration (for repository downloads)
# Get these from AWS IAM Console

# Your AWS Access Key ID
AWS_ACCESS_KEY_ID=your_access_key_id_here

# Your AWS Secret Access Key (keep this secret!)
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here

# AWS Region (e.g., us-east-1, eu-west-1, ap-southeast-1)
AWS_REGION=us-east-1

# S3 Bucket name for storing repository downloads
AWS_S3_BUCKET_NAME=your-repository-downloads-bucket
```

#### 3. Updated API Route

Replace `app/api/download-repo/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';

const execAsync = promisify(exec);

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { repository, accessToken } = await request.json();
    
    if (!repository || !accessToken) {
      return NextResponse.json({ error: 'Repository and access token are required' }, { status: 400 });
    }

    console.log('Processing download request for:', repository.full_name);

    // Step 1: Get repository details
    const repoResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!repoResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch repository details' }, { status: repoResponse.status });
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.mainbranch?.name || 'master';

    // Step 2: Clone repository to temporary location
    const tempDir = path.join('/tmp', `repo-${Date.now()}`);
    const cloneUrl = repository.clone_url.replace('https://', `https://x-token-auth:${accessToken}@`);
    
    await execAsync(`git clone --depth 1 --branch ${defaultBranch} ${cloneUrl} ${tempDir}`);

    // Step 3: Create ZIP file
    const zipFileName = `${repository.name}-${defaultBranch}.zip`;
    const zipFilePath = path.join('/tmp', zipFileName);
    
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(tempDir, false);
    await archive.finalize();

    // Step 4: Upload to S3
    const s3Key = `repositories/${repository.full_name}/${zipFileName}`;
    const fileBuffer = fs.readFileSync(zipFilePath);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/zip',
      Metadata: {
        'repository-name': repository.name,
        'repository-full-name': repository.full_name,
        'branch': defaultBranch,
        'language': repository.language || 'unknown',
        'size': repository.size.toString(),
      },
    }));

    // Step 5: Generate presigned URL
    const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key,
    }), { expiresIn: 3600 }); // 1 hour

    // Step 6: Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.unlinkSync(zipFilePath);

    return NextResponse.json({
      success: true,
      downloadUrl: presignedUrl,
      fileName: zipFileName,
      expiresIn: 3600,
      repository: {
        name: repository.name,
        fullName: repository.full_name,
        defaultBranch: defaultBranch,
        size: repository.size,
        language: repository.language,
      },
    });

  } catch (error) {
    console.error('Error in download-repo API:', error);
    return NextResponse.json({ 
      error: 'Failed to process download request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

#### 4. Environment Variable Validation

The API route automatically validates your AWS S3 credentials:

```typescript
// Check if AWS S3 credentials are configured
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.AWS_REGION;
const awsBucketName = process.env.AWS_S3_BUCKET_NAME;

if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !awsBucketName) {
  return NextResponse.json({
    success: false,
    message: 'AWS S3 integration not configured. Please set up environment variables.',
    missingCredentials: {
      AWS_ACCESS_KEY_ID: !awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: !awsSecretAccessKey,
      AWS_REGION: !awsRegion,
      AWS_S3_BUCKET_NAME: !awsBucketName
    }
  }, { status: 500 });
}
```

**Testing Configuration:**
1. Start your development server: `npm run dev`
2. Connect to Bitbucket
3. Click "Download ZIP" on any repository
4. Check the console for configuration status
5. If credentials are missing, you'll see a detailed error message

#### 5. Update Frontend

```typescript
const handleDownloadRepo = async (repo: Repository) => {
  try {
    setCopiedUrl(`${repo.full_name}-download`);
    
    if (!accessToken) {
      alert('Authentication required for repository download.');
      setCopiedUrl(null);
      return;
    }

    const response = await fetch('/api/download-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repository: repo, accessToken }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download started:', data.fileName);
    } else {
      alert(data.message || 'Download failed. Please try again.');
    }
    
    setTimeout(() => setCopiedUrl(null), 3000);
    
  } catch (error) {
    console.error('Download error:', error);
    alert('Download failed. Please try again.');
    setCopiedUrl(null);
  }
};
```

### AWS S3 Setup

#### 1. Create S3 Bucket

```bash
aws s3 mb s3://your-repository-downloads-bucket
```

#### 2. Configure CORS

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

#### 3. IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-repository-downloads-bucket/*"
    }
  ]
}
```

### Benefits

1. **Reliability**: No more "Cannot resolve the cset" errors
2. **Performance**: Faster downloads from S3
3. **Scalability**: Handles large repositories
4. **Progress Tracking**: Can implement download progress
5. **Error Handling**: Better error messages and retry logic
6. **Caching**: S3 can cache frequently downloaded repositories
7. **Analytics**: Track download patterns and usage

### Security Considerations

1. **Access Control**: Use IAM roles and policies
2. **Presigned URLs**: Time-limited access
3. **Cleanup**: Automatic cleanup of temporary files
4. **Rate Limiting**: Implement rate limiting for API calls
5. **Monitoring**: Monitor S3 usage and costs

### Cost Optimization

1. **Lifecycle Policies**: Automatically delete old files
2. **Compression**: Use high compression for ZIP files
3. **CDN**: Use CloudFront for global distribution
4. **Storage Classes**: Use appropriate S3 storage classes

### Monitoring

1. **CloudWatch**: Monitor API calls and errors
2. **S3 Analytics**: Track storage usage
3. **Application Logs**: Log download requests and errors
4. **Cost Alerts**: Set up billing alerts

## Migration Timeline

1. **Phase 1**: Implement AWS S3 integration (Current)
2. **Phase 2**: Add progress tracking and error handling
3. **Phase 3**: Implement caching and optimization
4. **Phase 4**: Add analytics and monitoring
5. **Phase 5**: Deploy to production

## Testing

1. **Unit Tests**: Test API route functionality
2. **Integration Tests**: Test S3 upload/download
3. **Load Tests**: Test with large repositories
4. **Error Tests**: Test error scenarios
5. **Security Tests**: Test access controls
