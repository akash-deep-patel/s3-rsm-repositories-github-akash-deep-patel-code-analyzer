import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    console.log('GitHub OAuth callback received code:', code);

    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('GitHub OAuth credentials not configured');
      return NextResponse.json({ 
        error: 'GitHub OAuth not configured. Please set up environment variables.' 
      }, { status: 500 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for token:', tokenResponse.status);
      return NextResponse.json({ 
        error: 'Failed to exchange authorization code for access token' 
      }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData.error_description || tokenData.error);
      return NextResponse.json({ 
        error: tokenData.error_description || 'OAuth exchange failed' 
      }, { status: 400 });
    }

    console.log('GitHub OAuth token exchange successful');

    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });

  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error);
    return NextResponse.json({ 
      error: 'Internal server error during OAuth callback' 
    }, { status: 500 });
  }
}
