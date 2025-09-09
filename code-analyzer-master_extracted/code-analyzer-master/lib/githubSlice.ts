import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { mcpClient } from './mcpClient';

// GitHub Repository Interface
export interface GitHubRepository {
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

// GitHub File Interface
export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  url: string;
  download_url?: string;
}

// GitHub State Interface
interface GitHubState {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  username: string | null;
  accessToken: string | null;
  repositories: GitHubRepository[];
  selectedRepository: GitHubRepository | null;
  repositoryStructure: GitHubFile[];
  currentPath: string;
  fileContent: string | null;
  fileLoading: boolean;
}

// Initial State
const initialState: GitHubState = {
  isConnected: false,
  loading: false,
  error: null,
  username: null,
  accessToken: null,
  repositories: [],
  selectedRepository: null,
  repositoryStructure: [],
  currentPath: '',
  fileContent: null,
  fileLoading: false,
};

// GitHub OAuth URL Generator
export const getGitHubOAuthUrl = () => {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/github/callback`;
  const scope = 'repo read:user user:email';
  
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
};

// Async Thunks
export const exchangeGitHubCode = createAsyncThunk(
  'github/exchangeCode',
  async (code: string) => {
    const response = await fetch('/api/auth/github/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data;
  }
);

export const fetchGitHubUser = createAsyncThunk(
  'github/fetchUser',
  async (accessToken: string) => {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return await response.json();
  }
);

export const fetchGitHubRepositories = createAsyncThunk(
  'github/fetchRepositories',
  async (accessToken: string) => {
    console.log('fetchGitHubRepositories called with token:', accessToken ? 'Available' : 'Not available');
    
    // Set the access token for MCP
    mcpClient.setAccessToken(accessToken);
    
    try {
      console.log('Attempting to fetch repositories via MCP...');
      // First try to use MCP
      const mcpResult = await mcpClient.listRepositories();
      console.log('MCP result:', mcpResult);
      return mcpResult;
    } catch (error) {
      console.log('MCP failed, falling back to direct GitHub API:', error);
      
      // Fallback to direct GitHub API
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GitHub API error:', response.status, errorText);
        throw new Error(`Failed to fetch repositories: ${response.status} - ${errorText}`);
      }

      const directResult = await response.json();
      console.log('Direct GitHub API result:', directResult);
      return directResult;
    }
  }
);

// MCP-based async thunks
export const fetchRepositoryStructure = createAsyncThunk(
  'github/fetchRepositoryStructure',
  async ({ repoFullName, path, branch }: { repoFullName: string; path?: string; branch?: string }) => {
    return await mcpClient.getRepositoryStructure(repoFullName, path || '', branch || 'main');
  }
);

export const fetchFileContent = createAsyncThunk(
  'github/fetchFileContent',
  async ({ repoFullName, filePath, branch }: { repoFullName: string; filePath: string; branch?: string }) => {
    return await mcpClient.readFileContent(repoFullName, filePath, branch || 'main');
  }
);

export const cloneRepository = createAsyncThunk(
  'github/cloneRepository',
  async ({ repoFullName, targetPath, branch }: { repoFullName: string; targetPath: string; branch?: string }) => {
    return await mcpClient.cloneRepository(repoFullName, targetPath, branch || 'main');
  }
);

export const searchRepositories = createAsyncThunk(
  'github/searchRepositories',
  async ({ query, limit }: { query: string; limit?: number }) => {
    return await mcpClient.searchRepositories(query, limit || 10);
  }
);

// GitHub Slice
const githubSlice = createSlice({
  name: 'github',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedRepository: (state, action: PayloadAction<GitHubRepository>) => {
      state.selectedRepository = action.payload;
      state.currentPath = '';
      state.repositoryStructure = [];
      state.fileContent = null;
    },
    clearSelectedRepository: (state) => {
      state.selectedRepository = null;
      state.currentPath = '';
      state.repositoryStructure = [];
      state.fileContent = null;
    },
    setCurrentPath: (state, action: PayloadAction<string>) => {
      state.currentPath = action.payload;
    },
    setRepositoryStructure: (state, action: PayloadAction<GitHubFile[]>) => {
      state.repositoryStructure = action.payload;
    },
    setFileContent: (state, action: PayloadAction<string>) => {
      state.fileContent = action.payload;
    },
    disconnect: (state) => {
      state.isConnected = false;
      state.username = null;
      state.accessToken = null;
      state.repositories = [];
      state.selectedRepository = null;
      state.repositoryStructure = [];
      state.currentPath = '';
      state.fileContent = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Exchange Code
      .addCase(exchangeGitHubCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exchangeGitHubCode.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.access_token;
        state.isConnected = true;
      })
      .addCase(exchangeGitHubCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to authenticate with GitHub';
      })
      // Fetch User
      .addCase(fetchGitHubUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGitHubUser.fulfilled, (state, action) => {
        state.loading = false;
        state.username = action.payload.login;
      })
      .addCase(fetchGitHubUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user data';
      })
      // Fetch Repositories
      .addCase(fetchGitHubRepositories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGitHubRepositories.fulfilled, (state, action) => {
        state.loading = false;
        state.repositories = action.payload;
      })
      .addCase(fetchGitHubRepositories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch repositories';
      })
      // Fetch Repository Structure
      .addCase(fetchRepositoryStructure.pending, (state) => {
        state.fileLoading = true;
        state.error = null;
      })
      .addCase(fetchRepositoryStructure.fulfilled, (state, action) => {
        state.fileLoading = false;
        state.repositoryStructure = action.payload;
      })
      .addCase(fetchRepositoryStructure.rejected, (state, action) => {
        state.fileLoading = false;
        state.error = action.error.message || 'Failed to fetch repository structure';
      })
      // Fetch File Content
      .addCase(fetchFileContent.pending, (state) => {
        state.fileLoading = true;
        state.error = null;
      })
      .addCase(fetchFileContent.fulfilled, (state, action) => {
        state.fileLoading = false;
        state.fileContent = action.payload;
      })
      .addCase(fetchFileContent.rejected, (state, action) => {
        state.fileLoading = false;
        state.error = action.error.message || 'Failed to fetch file content';
      })
      // Clone Repository
      .addCase(cloneRepository.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cloneRepository.fulfilled, (state, action) => {
        state.loading = false;
        // Handle successful clone
      })
      .addCase(cloneRepository.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to clone repository';
      });
  },
});

export const {
  clearError,
  setSelectedRepository,
  clearSelectedRepository,
  setCurrentPath,
  setRepositoryStructure,
  setFileContent,
  disconnect,
} = githubSlice.actions;

export default githubSlice.reducer;
