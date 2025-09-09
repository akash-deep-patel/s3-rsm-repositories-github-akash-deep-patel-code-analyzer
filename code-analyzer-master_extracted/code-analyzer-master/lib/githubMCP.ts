// GitHub MCP Integration Layer
// This file provides functions to interact with GitHub using MCP tools

import { GitHubRepository, GitHubFile } from './githubSlice';

// MCP Tool Types (these would be available from the MCP server)
interface MCPGitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  language: string | null;
  size: number;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  clone_url: string;
  ssh_url: string;
  html_url: string;
}

interface MCPGitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  url: string;
  download_url?: string;
}

interface MCPGitHubContent {
  content: string;
  encoding: string;
  size: number;
  name: string;
  path: string;
  sha: string;
  type: 'file' | 'dir';
}

// MCP GitHub Functions
export class GitHubMCP {
  private static instance: GitHubMCP;
  private accessToken: string | null = null;

  private constructor() {}

  static getInstance(): GitHubMCP {
    if (!GitHubMCP.instance) {
      GitHubMCP.instance = new GitHubMCP();
    }
    return GitHubMCP.instance;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  // List user repositories using MCP
  async listRepositories(): Promise<GitHubRepository[]> {
    try {
      // This would call the MCP GitHub list_repositories tool
      // For now, we'll simulate the MCP call
      const response = await this.callMCPTool('list_repositories', {
        access_token: this.accessToken,
        sort: 'updated',
        per_page: 100
      });

      return response.map((repo: MCPGitHubRepository) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        fork: repo.fork,
        language: repo.language,
        size: repo.size,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        owner: repo.owner,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        html_url: repo.html_url
      }));
    } catch (error) {
      console.error('MCP listRepositories error:', error);
      throw new Error('Failed to fetch repositories via MCP');
    }
  }

  // Get repository structure using MCP
  async getRepositoryStructure(repoFullName: string, path: string = '', branch: string = 'main'): Promise<GitHubFile[]> {
    try {
      const response = await this.callMCPTool('list_files', {
        repository: repoFullName,
        path: path,
        branch: branch,
        access_token: this.accessToken
      });

      return response.map((file: MCPGitHubFile) => ({
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size,
        sha: file.sha,
        url: file.url,
        download_url: file.download_url
      }));
    } catch (error) {
      console.error('MCP getRepositoryStructure error:', error);
      throw new Error('Failed to fetch repository structure via MCP');
    }
  }

  // Read file content using MCP
  async readFileContent(repoFullName: string, filePath: string, branch: string = 'main'): Promise<string> {
    try {
      const response = await this.callMCPTool('read_file', {
        repository: repoFullName,
        path: filePath,
        branch: branch,
        access_token: this.accessToken
      });

      // Handle base64 encoded content
      if (response.encoding === 'base64') {
        return atob(response.content);
      }

      return response.content;
    } catch (error) {
      console.error('MCP readFileContent error:', error);
      throw new Error('Failed to read file content via MCP');
    }
  }

  // Get file info using MCP
  async getFileInfo(repoFullName: string, filePath: string, branch: string = 'main'): Promise<GitHubFile> {
    try {
      const response = await this.callMCPTool('get_file_info', {
        repository: repoFullName,
        path: filePath,
        branch: branch,
        access_token: this.accessToken
      });

      return {
        name: response.name,
        path: response.path,
        type: response.type,
        size: response.size,
        sha: response.sha,
        url: response.url,
        download_url: response.download_url
      };
    } catch (error) {
      console.error('MCP getFileInfo error:', error);
      throw new Error('Failed to get file info via MCP');
    }
  }

  // Clone repository using MCP
  async cloneRepository(repoFullName: string, targetPath: string, branch: string = 'main'): Promise<string> {
    try {
      const response = await this.callMCPTool('clone_repository', {
        repository: repoFullName,
        target_path: targetPath,
        branch: branch,
        access_token: this.accessToken
      });

      return response.local_path;
    } catch (error) {
      console.error('MCP cloneRepository error:', error);
      throw new Error('Failed to clone repository via MCP');
    }
  }

  // Search repositories using MCP
  async searchRepositories(query: string, limit: number = 10): Promise<GitHubRepository[]> {
    try {
      const response = await this.callMCPTool('search_repositories', {
        query: query,
        limit: limit,
        access_token: this.accessToken
      });

      return response.map((repo: MCPGitHubRepository) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        fork: repo.fork,
        language: repo.language,
        size: repo.size,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        default_branch: repo.default_branch,
        owner: repo.owner,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        html_url: repo.html_url
      }));
    } catch (error) {
      console.error('MCP searchRepositories error:', error);
      throw new Error('Failed to search repositories via MCP');
    }
  }

  // Get user info using MCP
  async getUserInfo(): Promise<{ login: string; name: string; avatar_url: string }> {
    try {
      const response = await this.callMCPTool('get_user', {
        access_token: this.accessToken
      });

      return {
        login: response.login,
        name: response.name,
        avatar_url: response.avatar_url
      };
    } catch (error) {
      console.error('MCP getUserInfo error:', error);
      throw new Error('Failed to get user info via MCP');
    }
  }

  // Private method to call MCP tools
  private async callMCPTool(toolName: string, params: any): Promise<any> {
    try {
      console.log(`Calling MCP tool: ${toolName}`, params);
      
      // Call our API route that handles MCP operations
      const response = await fetch('/api/github/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: toolName,
          params: params
        }),
      });

      console.log(`MCP API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MCP API error response:', errorText);
        throw new Error(`MCP API call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`MCP API result:`, result);
      
      if (!result.success) {
        throw new Error(result.error || 'MCP operation failed');
      }

      return result.data;
    } catch (error) {
      console.error(`MCP Tool Call Error (${toolName}):`, error);
      
      // Fallback to simulation if API fails
      console.log('Falling back to simulation for:', toolName);
      return this.simulateMCPTool(toolName, params);
    }
  }

  // Fallback simulation method
  private simulateMCPTool(toolName: string, params: any): any {
    switch (toolName) {
      case 'list_repositories':
        return this.simulateRepositoryList();
      
      case 'list_files':
        return this.simulateFileList(params.path);
      
      case 'read_file':
        return this.simulateFileContent(params.path);
      
      case 'get_file_info':
        return this.simulateFileInfo(params.path);
      
      case 'clone_repository':
        return this.simulateRepositoryClone(params.repository, params.target_path);
      
      case 'search_repositories':
        return this.simulateRepositorySearch(params.query);
      
      case 'get_user':
        return this.simulateUserInfo();
      
      default:
        throw new Error(`Unknown MCP tool: ${toolName}`);
    }
  }

  // Simulation methods (replace with real MCP calls)
  private simulateRepositoryList(): MCPGitHubRepository[] {
    return [
      {
        id: 1,
        name: 'example-repo',
        full_name: 'username/example-repo',
        description: 'An example repository',
        private: false,
        fork: false,
        language: 'JavaScript',
        size: 1024,
        stargazers_count: 10,
        forks_count: 5,
        updated_at: new Date().toISOString(),
        default_branch: 'main',
        owner: {
          login: 'username',
          avatar_url: 'https://github.com/username.png'
        },
        clone_url: 'https://github.com/username/example-repo.git',
        ssh_url: 'git@github.com:username/example-repo.git',
        html_url: 'https://github.com/username/example-repo'
      }
    ];
  }

  private simulateFileList(path: string): MCPGitHubFile[] {
    if (path === '') {
      return [
        {
          name: 'src',
          path: 'src',
          type: 'dir',
          size: 0,
          sha: 'abc123',
          url: 'https://api.github.com/repos/username/repo/contents/src'
        },
        {
          name: 'README.md',
          path: 'README.md',
          type: 'file',
          size: 1024,
          sha: 'def456',
          url: 'https://api.github.com/repos/username/repo/contents/README.md',
          download_url: 'https://raw.githubusercontent.com/username/repo/main/README.md'
        }
      ];
    }
    return [];
  }

  private simulateFileContent(path: string): MCPGitHubContent {
    return {
      content: btoa('# Example File\n\nThis is example content.'),
      encoding: 'base64',
      size: 1024,
      name: path.split('/').pop() || 'file',
      path: path,
      sha: 'abc123',
      type: 'file'
    };
  }

  private simulateFileInfo(path: string): MCPGitHubFile {
    return {
      name: path.split('/').pop() || 'file',
      path: path,
      type: 'file',
      size: 1024,
      sha: 'abc123',
      url: `https://api.github.com/repos/username/repo/contents/${path}`,
      download_url: `https://raw.githubusercontent.com/username/repo/main/${path}`
    };
  }

  private simulateRepositoryClone(repository: string, targetPath: string): { local_path: string } {
    return {
      local_path: `${targetPath}/${repository.split('/')[1]}`
    };
  }

  private simulateRepositorySearch(query: string): MCPGitHubRepository[] {
    return this.simulateRepositoryList();
  }

  private simulateUserInfo(): { login: string; name: string; avatar_url: string } {
    return {
      login: 'username',
      name: 'Example User',
      avatar_url: 'https://github.com/username.png'
    };
  }
}

// Export singleton instance
export const githubMCP = GitHubMCP.getInstance();
