import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('OAuth callback API route called');
    
    const { code } = await request.json();
    console.log('Authorization code received:', code ? 'Yes' : 'No');

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_BITBUCKET_CLIENT_ID;
    const clientSecret = process.env.BITBUCKET_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

    console.log('Environment variables check:');
    console.log('- Client ID:', clientId ? 'Present' : 'Missing');
    console.log('- Client Secret:', clientSecret ? 'Present' : 'Missing');
    console.log('- Redirect URI:', redirectUri);

    if (!clientId || !clientSecret) {
      console.error('OAuth configuration missing');
      return NextResponse.json({ error: 'OAuth configuration missing' }, { status: 500 });
    }

    console.log('Making token exchange request to Bitbucket...');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      console.error('Response status:', tokenResponse.status);
      console.error('Response headers:', Object.fromEntries(tokenResponse.headers.entries()));
      return NextResponse.json({ 
        error: 'Failed to exchange authorization code',
        details: errorData,
        status: tokenResponse.status
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
