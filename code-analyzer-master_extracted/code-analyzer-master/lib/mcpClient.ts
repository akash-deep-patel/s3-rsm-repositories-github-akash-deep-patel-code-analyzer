// MCP Client for GitHub Integration
// This connects to the GitHub MCP server configured in mcp.json

interface MCPRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class MCPClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    // Use the GitHub MCP server URL from mcp.json
    this.baseUrl = 'https://api.githubcopilot.com/mcp/';
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(method: string, params: any): Promise<any> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Math.random().toString(36).substr(2, 9),
      method,
      params: {
        ...params,
        access_token: this.accessToken
      }
    };

    try {
      console.log(`MCP Request to ${this.baseUrl}:`, request);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
      }

      const result: MCPResponse = await response.json();
      console.log('MCP Response:', result);

      if (result.error) {
        throw new Error(`MCP error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.error('MCP request failed:', error);
      throw error;
    }
  }

  // GitHub MCP Tools
  async listRepositories(): Promise<any[]> {
    return this.makeRequest('mcp_github_list_repositories', {});
  }

  async getRepositoryStructure(repository: string, path: string = '', branch: string = 'main'): Promise<any[]> {
    return this.makeRequest('mcp_github_list_files', {
      repository,
      path,
      branch
    });
  }

  async readFileContent(repository: string, path: string, branch: string = 'main'): Promise<any> {
    return this.makeRequest('mcp_github_read_file', {
      repository,
      path,
      branch
    });
  }

  async cloneRepository(repository: string, targetPath: string, branch: string = 'main'): Promise<any> {
    return this.makeRequest('mcp_github_clone_repository', {
      repository,
      target_path: targetPath,
      branch
    });
  }

  async searchRepositories(query: string, limit: number = 10): Promise<any[]> {
    return this.makeRequest('mcp_github_search_repositories', {
      query,
      limit
    });
  }

  async getUserInfo(): Promise<any> {
    return this.makeRequest('mcp_github_get_user', {});
  }
}

// Export singleton instance
export const mcpClient = new MCPClient();
