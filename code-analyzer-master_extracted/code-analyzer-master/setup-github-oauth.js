#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(process.cwd(), '.env.local');

console.log('🔧 GitHub OAuth Setup\n');
console.log('This script will help you configure GitHub OAuth credentials.');
console.log('You\'ll need to create a GitHub OAuth App first:\n');
console.log('1. Go to https://github.com/settings/developers');
console.log('2. Click "New OAuth App"');
console.log('3. Fill in the details:');
console.log('   - Application name: Repository Manager (or any name)');
console.log('   - Homepage URL: http://localhost:3000');
console.log('   - Authorization callback URL: http://localhost:3000/auth/github/callback');
console.log('4. Click "Register application"\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGitHubOAuth() {
  try {
    const clientId = await question('Enter your GitHub OAuth App Client ID: ');
    const clientSecret = await question('Enter your GitHub OAuth App Client Secret: ');

    if (!clientId || !clientSecret) {
      console.log('❌ Client ID and Client Secret are required!');
      process.exit(1);
    }

    // Read existing .env.local file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Update or add GitHub OAuth variables
    const lines = envContent.split('\n');
    let updatedLines = [];
    let githubClientIdFound = false;
    let githubClientSecretFound = false;

    for (const line of lines) {
      if (line.startsWith('NEXT_PUBLIC_GITHUB_CLIENT_ID=')) {
        updatedLines.push(`NEXT_PUBLIC_GITHUB_CLIENT_ID=${clientId}`);
        githubClientIdFound = true;
      } else if (line.startsWith('GITHUB_CLIENT_SECRET=')) {
        updatedLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);
        githubClientSecretFound = true;
      } else {
        updatedLines.push(line);
      }
    }

    // Add GitHub variables if they don't exist
    if (!githubClientIdFound) {
      updatedLines.push(`NEXT_PUBLIC_GITHUB_CLIENT_ID=${clientId}`);
    }
    if (!githubClientSecretFound) {
      updatedLines.push(`GITHUB_CLIENT_SECRET=${clientSecret}`);
    }

    // Write back to .env.local
    fs.writeFileSync(envPath, updatedLines.join('\n'));

    console.log('\n✅ GitHub OAuth configuration saved to .env.local');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Navigate to http://localhost:3000/github');
    console.log('3. Click "Connect with GitHub" to test the OAuth flow');
    console.log('\n🔒 Security note: Keep your Client Secret secure and never commit it to version control!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupGitHubOAuth();
