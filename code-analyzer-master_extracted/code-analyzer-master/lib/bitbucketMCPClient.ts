// Bitbucket MCP Client for Integration
// This connects to the Bitbucket MCP server configured in mcp.json

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

export class BitbucketMCPClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    // Use the Bitbucket MCP server URL from mcp.json
    // For now, we'll use a placeholder URL - you can configure this in mcp.json
    this.baseUrl = 'https://api.bitbucket.org/mcp/';
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
      console.log(`Bitbucket MCP Request to ${this.baseUrl}:`, request);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Bitbucket MCP server error: ${response.status} ${response.statusText}`);
      }

      const result: MCPResponse = await response.json();
      console.log('Bitbucket MCP Response:', result);

      if (result.error) {
        throw new Error(`Bitbucket MCP error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.error('Bitbucket MCP request failed:', error);
      throw error;
    }
  }

  // Bitbucket MCP Tools
  async listRepositories(): Promise<any[]> {
    return this.makeRequest('mcp_bitbucket_list_repositories', {});
  }

  async getRepositoryStructure(repository: string, path: string = '', branch: string = 'main'): Promise<any[]> {
    return this.makeRequest('mcp_bitbucket_list_files', {
      repository,
      path,
      branch
    });
  }

  async readFileContent(repository: string, path: string, branch: string = 'main'): Promise<any> {
    return this.makeRequest('mcp_bitbucket_read_file', {
      repository,
      path,
      branch
    });
  }

  async cloneRepository(repository: string, targetPath: string, branch: string = 'main'): Promise<any> {
    return this.makeRequest('mcp_bitbucket_clone_repository', {
      repository,
      target_path: targetPath,
      branch
    });
  }

  async searchRepositories(query: string, limit: number = 10): Promise<any[]> {
    return this.makeRequest('mcp_bitbucket_search_repositories', {
      query,
      limit
    });
  }

  async getUserInfo(): Promise<any> {
    return this.makeRequest('mcp_bitbucket_get_user', {});
  }

  async getRepositoryInfo(repository: string): Promise<any> {
    return this.makeRequest('mcp_bitbucket_get_repository', {
      repository
    });
  }
}

// Export singleton instance
export const bitbucketMCPClient = new BitbucketMCPClient();
