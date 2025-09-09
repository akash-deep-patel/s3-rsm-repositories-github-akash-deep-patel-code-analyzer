import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const execAsync = promisify(exec);

// AWS S3 Configuration
const awsRegion = process.env.AWS_REGION || 'us-east-1';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const s3BucketName = process.env.AWS_S3_BUCKET_NAME;

const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId!,
    secretAccessKey: awsSecretAccessKey!,
  },
  endpoint: `https://s3.${awsRegion}.amazonaws.com`,
});

export async function POST(request: NextRequest) {
  try {
    const { repository, accessToken } = await request.json();

    console.log('GitHub Download Request:', { repository, accessToken: !!accessToken });

    if (!repository) {
      return NextResponse.json({ error: 'Repository information is required' }, { status: 400 });
    }

    if (!awsAccessKeyId || !awsSecretAccessKey || !s3BucketName) {
      return NextResponse.json({ 
        error: 'AWS S3 credentials not configured. Please set up AWS S3 environment variables.' 
      }, { status: 500 });
    }

    // Extract repository name from full name (e.g., "username/repo-name" -> "repo-name")
    const repoName = repository.full_name.split('/')[1];
    const zipFileName = `${repoName}.zip`;
    const s3Key = `repositories/github/${repository.full_name}/${zipFileName}`;

    // Check if file already exists in S3 and log for overwrite
    let wasOverwrite = false;
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: s3BucketName,
        Key: s3Key,
      }));
      console.log(`File already exists in S3: ${s3Key} - Will overwrite`);
      wasOverwrite = true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        console.log(`File does not exist in S3: ${s3Key} - Will create new`);
      } else {
        console.error('Error checking S3 file existence:', error);
      }
    }

    // Create temporary directory for cloning
    const tempDir = path.join(process.cwd(), 'temp-clone');
    const cloneDir = path.join(tempDir, repoName);

    // Clean up any existing temporary files first
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Cleaned up existing temporary directory');
      }
    } catch (error) {
      console.error('Failed to clean up existing temp directory:', error);
    }

    // Create fresh temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created fresh temporary directory');

    // Clone repository
    console.log(`Cloning repository from: ${repository.clone_url}`);
    
    // Use HTTPS clone URL with access token for private repos
    const cloneUrl = repository.private 
      ? `https://${accessToken}@github.com/${repository.full_name}.git`
      : repository.clone_url;

    try {
      await execAsync(`git clone ${cloneUrl} "${cloneDir}"`, { cwd: tempDir });
      console.log('Repository cloned successfully');
    } catch (error) {
      console.error('Git clone failed:', error);
      return NextResponse.json({ error: 'Failed to clone repository' }, { status: 500 });
    }

    // Create ZIP file
    const zipFilePath = path.join(tempDir, zipFileName);
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`ZIP file created: ${zipFilePath} (${archive.pointer()} bytes)`);
    });

    archive.on('error', (err: Error) => {
      console.error('Archive error:', err);
    });

    archive.pipe(output);
    archive.directory(cloneDir, false);
    await archive.finalize();

    // Upload to S3
    console.log(`Uploading to S3: ${s3BucketName}/${s3Key}`);
    const fileContent = fs.readFileSync(zipFilePath);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/zip',
      Metadata: {
        'repository-name': repository.name,
        'repository-full-name': repository.full_name,
        'clone-url': repository.clone_url,
        'download-date': new Date().toISOString(),
        'source': 'github'
      }
    }));

    console.log('File uploaded to S3 successfully');

    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('Temporary files cleaned up');
    } catch (error) {
      console.error('Failed to clean up temporary files:', error);
    }

    // Generate presigned URL for download
    const presignedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: s3BucketName,
        Key: s3Key,
      }),
      { expiresIn: 3600 } // 1 hour
    );

    // Generate download commands
    const downloadCommands = {
      awsCli: `aws s3 cp s3://${s3BucketName}/${s3Key} ./${zipFileName} --region ${awsRegion}`,
      curl: `curl -o ${zipFileName} "${presignedUrl}"`,
      wget: `wget -O ${zipFileName} "${presignedUrl}"`,
      powershell: `Invoke-WebRequest -Uri "${presignedUrl}" -OutFile "${zipFileName}"`
    };

    const message = wasOverwrite 
      ? `Repository "${repository.name}" downloaded and overwritten in S3 successfully`
      : `Repository "${repository.name}" downloaded and uploaded to S3 successfully`;

    return NextResponse.json({
      success: true,
      message: message,
      s3Key: s3Key,
      bucket: s3BucketName,
      region: awsRegion,
      fileName: zipFileName,
      downloadCommands: downloadCommands,
      presignedUrl: presignedUrl,
      wasOverwrite: wasOverwrite
    });

  } catch (error) {
    console.error('GitHub download error:', error);
    return NextResponse.json({ 
      error: 'Failed to download repository',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
