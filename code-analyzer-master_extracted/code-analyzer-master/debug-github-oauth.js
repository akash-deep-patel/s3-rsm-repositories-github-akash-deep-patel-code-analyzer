#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔍 GitHub OAuth Configuration Debug\n');

// Check environment variables
const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;

console.log('Environment Variables:');
console.log(`NEXT_PUBLIC_GITHUB_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
console.log(`GITHUB_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);

if (!clientId || !clientSecret) {
  console.log('\n❌ Missing required environment variables!');
  console.log('Run: npm run setup-github');
  process.exit(1);
}

// Generate OAuth URL
const redirectUri = 'http://localhost:3000/auth/github/callback';
const scope = 'repo read:user user:email';

const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

console.log('\n📋 OAuth Configuration:');
console.log(`Client ID: ${clientId}`);
console.log(`Redirect URI: ${redirectUri}`);
console.log(`Scope: ${scope}`);

console.log('\n🔗 Generated OAuth URL:');
console.log(oauthUrl);

console.log('\n📋 GitHub OAuth App Settings Required:');
console.log('1. Go to: https://github.com/settings/developers');
console.log('2. Find your OAuth App');
console.log('3. Verify these settings:');
console.log(`   - Client ID: ${clientId}`);
console.log(`   - Authorization callback URL: ${redirectUri}`);
console.log('4. Make sure the callback URL matches exactly!');

console.log('\n💡 If you\'re still getting redirect_uri errors:');
console.log('1. Double-check the callback URL in GitHub OAuth App settings');
console.log('2. Make sure there are no extra spaces or characters');
console.log('3. Try creating a new OAuth App if the issue persists');
console.log('4. Clear your browser cache and try again');

console.log('\n🚀 To test:');
console.log('1. Copy the OAuth URL above');
console.log('2. Paste it in your browser');
console.log('3. Authorize the application');
console.log('4. You should be redirected back to: http://localhost:3000/github?code=...');
