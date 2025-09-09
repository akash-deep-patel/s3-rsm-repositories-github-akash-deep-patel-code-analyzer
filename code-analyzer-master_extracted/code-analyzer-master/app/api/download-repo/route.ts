import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;
  let repoDir: string | null = null;

  try {
    const { repository, accessToken } = await request.json();
    
    if (!repository || !accessToken) {
      return NextResponse.json({ error: 'Repository and access token are required' }, { status: 400 });
    }

    console.log('Download request for repository:', repository.full_name);

    // Check if AWS S3 credentials are configured
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION;
    const awsBucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion || !awsBucketName) {
      console.error('AWS S3 credentials not configured');
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

    // Step 1: Get repository details and default branch
    const repoResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!repoResponse.ok) {
      console.error('Failed to fetch repository details:', repoResponse.status);
      return NextResponse.json({ error: 'Failed to fetch repository details' }, { status: repoResponse.status });
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.mainbranch?.name || 'master';

    console.log('Repository details:', {
      name: repository.name,
      fullName: repository.full_name,
      defaultBranch: defaultBranch,
      size: repository.size,
      language: repository.language
    });

    console.log('AWS S3 Configuration:', {
      region: awsRegion,
      bucket: awsBucketName,
      endpoint: `https://s3.${awsRegion}.amazonaws.com`
    });

    // Step 2: Create temporary directory
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'repo-download-'));
    repoDir = path.join(tempDir, repository.name);
    
    console.log('Created temporary directory:', tempDir);

    // Step 3: Clone the repository
    // Bitbucket API returns links object with clone URLs
    let cloneUrl = repository.links?.clone?.[0]?.href || repository.clone_url;
    
    // Fallback: construct clone URL manually if not available
    if (!cloneUrl) {
      cloneUrl = `https://bitbucket.org/${repository.full_name}.git`;
      console.log('Constructed fallback clone URL:', cloneUrl);
    }
    
    if (!cloneUrl) {
      console.error('No clone URL found in repository data:', repository);
      return NextResponse.json({ 
        error: 'No clone URL available',
        message: 'The repository does not have a valid clone URL. This might be a private repository or the API response is incomplete.'
      }, { status: 400 });
    }
    
    console.log('Cloning repository from:', cloneUrl);
    console.log('Repository data structure:', {
      name: repository.name,
      full_name: repository.full_name,
      links: repository.links,
      clone_url: repository.clone_url
    });
    
    try {
      await execAsync(`git clone --depth 1 --branch ${defaultBranch} ${cloneUrl} "${repoDir}"`, {
        cwd: tempDir,
        timeout: 300000 // 5 minutes timeout
      });
      console.log('Repository cloned successfully');
    } catch (cloneError) {
      console.error('Failed to clone repository:', cloneError);
      return NextResponse.json({ 
        error: 'Failed to clone repository',
        message: 'The repository could not be cloned. Please check the repository URL and permissions.'
      }, { status: 500 });
    }

    // Step 4: Create ZIP file
    const zipFileName = `${repository.name}-${defaultBranch}.zip`;
    const zipFilePath = path.join(tempDir, zipFileName);
    
    console.log('Creating ZIP file:', zipFilePath);
    
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log('ZIP file created successfully');
    });

    archive.on('error', (err: Error) => {
      console.error('Error creating ZIP:', err);
      throw err;
    });

    archive.pipe(output);
    archive.directory(repoDir, false);
    await archive.finalize();

    // Step 5: Initialize S3 client
    const s3Client = new S3Client({
      region: awsRegion,
      endpoint: `https://s3.${awsRegion}.amazonaws.com`,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Use a consistent key that will overwrite previous downloads
    const s3Key = `repositories/${repository.full_name}/${repository.name}-${defaultBranch}.zip`;
    const fileContent = fs.readFileSync(zipFilePath);
    
    console.log('Uploading to S3 with key:', s3Key);

    // Check if file already exists (for overwrite notification)
    let fileExists = false;
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: awsBucketName,
        Key: s3Key,
      });
      await s3Client.send(headCommand);
      fileExists = true;
      console.log('File already exists in S3, will overwrite');
    } catch (error) {
      console.log('File does not exist in S3, creating new file');
    }

    // Step 6: Upload to AWS S3 (this will overwrite if exists)
    console.log('Uploading to AWS S3...');
    
    const uploadCommand = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: 'application/zip',
      ContentDisposition: `attachment; filename="${repository.name}-${defaultBranch}.zip"`,
      // Add metadata to track when the file was last updated
      Metadata: {
        'last-updated': new Date().toISOString(),
        'repository': repository.full_name,
        'branch': defaultBranch,
        'original-size': repository.size.toString(),
        'overwritten': fileExists ? 'true' : 'false'
      }
    });

    await s3Client.send(uploadCommand);
    console.log('File uploaded to S3 successfully');

    // Step 7: Generate presigned URL for download
    const downloadCommand = new PutObjectCommand({
      Bucket: awsBucketName,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, downloadCommand, {
      expiresIn: 3600, // 1 hour
    });

    console.log('Presigned URL generated successfully');

    // Generate AWS CLI download command
    const awsCliCommand = `aws s3 cp s3://${awsBucketName}/${s3Key} ./${repository.name}-${defaultBranch}.zip --region ${awsRegion}`;
    
    return NextResponse.json({
      success: true,
      message: fileExists 
        ? 'Repository updated and uploaded to AWS S3 successfully (overwrote previous version)'
        : 'Repository downloaded and uploaded to AWS S3 successfully',
      downloadUrl: presignedUrl,
      repository: {
        name: repository.name,
        fullName: repository.full_name,
        defaultBranch: defaultBranch,
        size: repository.size,
        language: repository.language
      },
      awsS3Info: {
        bucketName: awsBucketName,
        region: awsRegion,
        key: s3Key,
        expiresIn: 3600,
        overwrote: fileExists
      },
      downloadCommands: {
        awsCli: awsCliCommand,
        curl: `curl -o "${repository.name}-${defaultBranch}.zip" "${presignedUrl}"`,
        wget: `wget -O "${repository.name}-${defaultBranch}.zip" "${presignedUrl}"`,
        powershell: `Invoke-WebRequest -Uri "${presignedUrl}" -OutFile "${repository.name}-${defaultBranch}.zip"`
      }
    });

  } catch (error) {
    console.error('Error in download-repo API:', error);
    return NextResponse.json({ 
      error: 'Failed to process download request',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  } finally {
    // Clean up temporary files
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        console.log('Temporary directory cleaned up');
      } catch (cleanupError) {
        console.error('Failed to cleanup temporary directory:', cleanupError);
      }
    }
  }
}
