import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '../../../../lib/mcpClient';

// True MCP GitHub integration with fallback to direct GitHub API

export async function POST(request: NextRequest) {
  try {
    const { action, params } = await request.json();

    console.log('GitHub MCP API call:', { action, params });
    console.log('Access token available:', !!params.access_token);

    // Set access token for MCP client
    if (params.access_token) {
      mcpClient.setAccessToken(params.access_token);
    }

    try {
      let result;
      
      switch (action) {
        case 'list_repositories':
          console.log('Calling MCP: list_repositories');
          result = await mcpClient.listRepositories();
          break;

        case 'list_files':
          console.log('Calling MCP: list_files', params);
          result = await mcpClient.getRepositoryStructure(
            params.repository, 
            params.path || '', 
            params.branch || 'main'
          );
          break;

        case 'read_file':
          console.log('Calling MCP: read_file', params);
          result = await mcpClient.readFileContent(
            params.repository, 
            params.path, 
            params.branch || 'main'
          );
          break;

        case 'clone_repository':
          console.log('Calling MCP: clone_repository', params);
          result = await mcpClient.cloneRepository(
            params.repository, 
            params.target_path || './cloned-repos'
          );
          break;

        case 'search_repositories':
          console.log('Calling MCP: search_repositories', params);
          result = await mcpClient.searchRepositories(params.query);
          break;

        case 'get_user':
          console.log('Calling MCP: get_user');
          result = await mcpClient.getUserInfo();
          break;

        default:
          return NextResponse.json({
            success: false,
            error: `Unknown MCP action: ${action}`
          }, { status: 400 });
      }

      console.log('MCP result:', result);
      
      return NextResponse.json({
        success: true,
        data: result
      });

    } catch (mcpError: any) {
      console.error('MCP operation failed:', mcpError);
      console.log('🔄 Falling back to direct GitHub API...');
      
      // Use fallback GitHub API implementation
      return await handleGitHubAPIFallback(action, params);
    }

  } catch (error: any) {
    console.error('GitHub MCP API error:', error);
    return NextResponse.json({
      success: false,
      error: `Internal server error: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

// Fallback GitHub API implementation when MCP fails
async function handleGitHubAPIFallback(action: string, params: any) {
  const accessToken = params.access_token;
  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Access token is required for fallback'
    }, { status: 400 });
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-MCP-Fallback'
  };

  try {
    switch (action) {
      case 'list_repositories':
        console.log('📋 Fallback: Fetching repositories via GitHub API');
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', { headers });
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        const repositories = await response.json();
        return NextResponse.json({ success: true, data: repositories });

      case 'list_files':
        console.log('📁 Fallback: Fetching repository structure via GitHub API');
        const { repository, path, branch } = params;
        const apiPath = path ? `${path}` : '';
        const apiUrl = `https://api.github.com/repos/${repository}/contents/${apiPath}?ref=${branch || 'main'}`;
        const filesResponse = await fetch(apiUrl, { headers });
        if (!filesResponse.ok) throw new Error(`GitHub API error: ${filesResponse.status}`);
        const files = await filesResponse.json();
        const fileList = Array.isArray(files) ? files : [files];
        return NextResponse.json({ success: true, data: fileList });

      case 'read_file':
        console.log('📄 Fallback: Reading file content via GitHub API');
        const { repository: repo, path: filePath, branch: fileBranch } = params;
        const fileApiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${fileBranch || 'main'}`;
        const fileResponse = await fetch(fileApiUrl, { headers });
        if (!fileResponse.ok) throw new Error(`GitHub API error: ${fileResponse.status}`);
        const fileData = await fileResponse.json();
        return NextResponse.json({ success: true, data: fileData });

      case 'get_user':
        console.log('👤 Fallback: Fetching user info via GitHub API');
        const userResponse = await fetch('https://api.github.com/user', { headers });
        if (!userResponse.ok) throw new Error(`GitHub API error: ${userResponse.status}`);
        const userData = await userResponse.json();
        return NextResponse.json({ success: true, data: userData });

      case 'clone_repository':
        console.log('🔗 Fallback: Generating clone URL (no actual cloning)');
        const { repository: repoName } = params;
        const cloneUrl = `https://github.com/${repoName}.git`;
        return NextResponse.json({
          success: true,
          data: {
            clone_url: cloneUrl,
            message: 'Clone URL generated (fallback mode)'
          }
        });

      case 'search_repositories':
        console.log('🔍 Fallback: Searching repositories via GitHub API');
        const { query, limit = 10 } = params;
        const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}`;
        const searchResponse = await fetch(searchUrl, { headers });
        if (!searchResponse.ok) throw new Error(`GitHub API error: ${searchResponse.status}`);
        const searchData = await searchResponse.json();
        return NextResponse.json({ success: true, data: searchData.items });

      default:
        return NextResponse.json({
          success: false,
          error: `Fallback not available for action: ${action}`
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('GitHub API fallback error:', error);
    return NextResponse.json({
      success: false,
      error: `Fallback failed: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
