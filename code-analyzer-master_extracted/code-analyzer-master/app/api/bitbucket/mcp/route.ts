import { NextRequest, NextResponse } from 'next/server';
import { bitbucketMCPClient } from '../../../../lib/bitbucketMCPClient';

// True MCP Bitbucket integration with fallback to direct Bitbucket API

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json();

    console.log('Bitbucket MCP API call:', { action, params });
    console.log('Access token available:', !!params.access_token);

    // Set access token for MCP client
    if (params.access_token) {
      bitbucketMCPClient.setAccessToken(params.access_token);
    }

    try {
      let result;
      
      switch (action) {
        case 'list_repositories':
          console.log('Calling Bitbucket MCP: list_repositories');
          result = await bitbucketMCPClient.listRepositories();
          break;

        case 'list_files':
          console.log('Calling Bitbucket MCP: list_files', params);
          result = await bitbucketMCPClient.getRepositoryStructure(
            params.repository, 
            params.path || '', 
            params.branch || 'main'
          );
          break;

        case 'read_file':
          console.log('Calling Bitbucket MCP: read_file', params);
          result = await bitbucketMCPClient.readFileContent(
            params.repository, 
            params.path, 
            params.branch || 'main'
          );
          break;

        case 'clone_repository':
          console.log('Calling Bitbucket MCP: clone_repository', params);
          result = await bitbucketMCPClient.cloneRepository(
            params.repository, 
            params.target_path || './cloned-repos'
          );
          break;

        case 'search_repositories':
          console.log('Calling Bitbucket MCP: search_repositories', params);
          result = await bitbucketMCPClient.searchRepositories(params.query);
          break;

        case 'get_user':
          console.log('Calling Bitbucket MCP: get_user');
          result = await bitbucketMCPClient.getUserInfo();
          break;

        case 'get_repository':
          console.log('Calling Bitbucket MCP: get_repository', params);
          result = await bitbucketMCPClient.getRepositoryInfo(params.repository);
          break;

        default:
          return NextResponse.json({
            success: false,
            error: `Unknown Bitbucket MCP action: ${action}`
          }, { status: 400 });
      }

      console.log('Bitbucket MCP result:', result);
      
      return NextResponse.json({
        success: true,
        data: result
      });

    } catch (mcpError: any) {
      console.error('Bitbucket MCP operation failed:', mcpError);
      console.log('🔄 Falling back to direct Bitbucket API...');
      
      // Use fallback Bitbucket API implementation
      return await handleBitbucketAPIFallback(action, params);
    }

  } catch (error: any) {
    console.error('Bitbucket MCP API error:', error);
    return NextResponse.json({
      success: false,
      error: `Internal server error: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

// Fallback Bitbucket API implementation when MCP fails
async function handleBitbucketAPIFallback(action: string, params: any) {
  const accessToken = params.access_token;
  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Access token is required for fallback'
    }, { status: 400 });
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
    'User-Agent': 'Bitbucket-MCP-Fallback'
  };

  try {
    switch (action) {
      case 'list_repositories':
        console.log('📋 Fallback: Fetching repositories via Bitbucket API');
        const response = await fetch('https://api.bitbucket.org/2.0/repositories?pagelen=100', { headers });
        if (!response.ok) throw new Error(`Bitbucket API error: ${response.status}`);
        const data = await response.json();
        return NextResponse.json({ success: true, data: data.values });

      case 'list_files':
        console.log('📁 Fallback: Fetching repository structure via Bitbucket API');
        const { repository, path, branch } = params;
        const apiPath = path ? `${path}` : '';
        const apiUrl = `https://api.bitbucket.org/2.0/repositories/${repository}/src/${branch || 'main'}/${apiPath}`;
        const filesResponse = await fetch(apiUrl, { headers });
        if (!filesResponse.ok) throw new Error(`Bitbucket API error: ${filesResponse.status}`);
        const filesData = await filesResponse.json();
        return NextResponse.json({ success: true, data: filesData.values });

      case 'read_file':
        console.log('📄 Fallback: Reading file content via Bitbucket API');
        const { repository: repo, path: filePath, branch: fileBranch } = params;
        const fileApiUrl = `https://api.bitbucket.org/2.0/repositories/${repo}/src/${fileBranch || 'main'}/${filePath}`;
        const fileResponse = await fetch(fileApiUrl, { headers });
        if (!fileResponse.ok) throw new Error(`Bitbucket API error: ${fileResponse.status}`);
        const fileData = await fileResponse.json();
        return NextResponse.json({ success: true, data: fileData });

      case 'get_user':
        console.log('👤 Fallback: Fetching user info via Bitbucket API');
        const userResponse = await fetch('https://api.bitbucket.org/2.0/user', { headers });
        if (!userResponse.ok) throw new Error(`Bitbucket API error: ${userResponse.status}`);
        const userData = await userResponse.json();
        return NextResponse.json({ success: true, data: userData });

      case 'get_repository':
        console.log('🏗️ Fallback: Fetching repository info via Bitbucket API');
        const { repository: repoName } = params;
        const repoApiUrl = `https://api.bitbucket.org/2.0/repositories/${repoName}`;
        const repoResponse = await fetch(repoApiUrl, { headers });
        if (!repoResponse.ok) throw new Error(`Bitbucket API error: ${repoResponse.status}`);
        const repoData = await repoResponse.json();
        return NextResponse.json({ success: true, data: repoData });

      case 'clone_repository':
        console.log('🔗 Fallback: Generating clone URL (no actual cloning)');
        const { repository: cloneRepo } = params;
        const cloneUrl = `https://bitbucket.org/${cloneRepo}.git`;
        return NextResponse.json({
          success: true,
          data: {
            clone_url: cloneUrl,
            message: 'Clone URL generated (fallback mode)'
          }
        });

      case 'search_repositories':
        console.log('🔍 Fallback: Searching repositories via Bitbucket API');
        const { query, limit = 10 } = params;
        const searchUrl = `https://api.bitbucket.org/2.0/repositories?q=${encodeURIComponent(query)}&pagelen=${limit}`;
        const searchResponse = await fetch(searchUrl, { headers });
        if (!searchResponse.ok) throw new Error(`Bitbucket API error: ${searchResponse.status}`);
        const searchData = await searchResponse.json();
        return NextResponse.json({ success: true, data: searchData.values });

      default:
        return NextResponse.json({
          success: false,
          error: `Fallback not available for action: ${action}`
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Bitbucket API fallback error:', error);
    return NextResponse.json({
      success: false,
      error: `Fallback failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
