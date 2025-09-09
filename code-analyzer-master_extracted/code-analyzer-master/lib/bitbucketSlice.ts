import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { bitbucketMCPClient } from './bitbucketMCPClient';

export interface Repository {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  size: number;
  language: string | null;
  updated_at: string;
  private: boolean;
  links?: {
    clone?: Array<{
      href: string;
      name: string;
    }>;
    html?: {
      href: string;
    };
  };
}

export interface FileNode {
  path: string;
  type: 'commit_directory' | 'commit_file';
  size?: number;
  mimetype?: string;
  language?: string;
  lastModified?: string;
}

export interface FileContent {
  content: string;
  encoding: string;
  size: number;
  mimetype: string;
}

interface BitbucketState {
  repositories: Repository[];
  selectedRepository: Repository | null;
  repositoryStructure: FileNode[];
  selectedFile: FileContent | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  username: string | null;
  accessToken: string | null;
  searchTerm: string;
  fileTypeFilter: string;
  sortBy: 'name' | 'size' | 'modified';
  sortOrder: 'asc' | 'desc';
}

const initialState: BitbucketState = {
  repositories: [],
  selectedRepository: null,
  repositoryStructure: [],
  selectedFile: null,
  loading: false,
  error: null,
  isConnected: false,
  username: null,
  accessToken: null,
  searchTerm: '',
  fileTypeFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
};

// OAuth configuration
const BITBUCKET_CLIENT_ID = process.env.NEXT_PUBLIC_BITBUCKET_CLIENT_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3001/auth/callback';

// Generate OAuth URL
export const getOAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: BITBUCKET_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
  });
  return `https://bitbucket.org/site/oauth2/authorize?${params.toString()}`;
};

// Exchange code for access token
export const exchangeCodeForToken = createAsyncThunk(
  'bitbucket/exchangeCodeForToken',
  async (code: string) => {
    const response = await fetch('/api/auth/callback', {
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
    return data.access_token;
  }
);

// Fetch repositories using MCP with fallback to direct API
export const fetchRepositories = createAsyncThunk(
  'bitbucket/fetchRepositories',
  async (accessToken: string) => {
    // Set access token for MCP client
    bitbucketMCPClient.setAccessToken(accessToken);
    
    try {
      console.log('Attempting to fetch repositories via Bitbucket MCP...');
      // First try to use MCP
      const [repositories, userInfo] = await Promise.all([
        bitbucketMCPClient.listRepositories(),
        bitbucketMCPClient.getUserInfo()
      ]);
      
      console.log('Bitbucket MCP result:', { repositories, userInfo });
      
      return {
        repositories: repositories,
        username: userInfo.username,
        accessToken,
      };
    } catch (error) {
      console.log('Bitbucket MCP failed, falling back to direct API:', error);
      
      // Fallback to direct Bitbucket API
      const [reposResponse, userResponse] = await Promise.all([
        fetch('https://api.bitbucket.org/2.0/repositories?role=member&pagelen=100', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch('https://api.bitbucket.org/2.0/user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!reposResponse.ok || !userResponse.ok) {
        throw new Error('Failed to fetch repositories from Bitbucket API');
      }

      const reposData = await reposResponse.json();
      const userData = await userResponse.json();

      // Debug: Log the first repository to see the structure
      if (reposData.values && reposData.values.length > 0) {
        console.log('First repository from Bitbucket API (fallback):', reposData.values[0]);
      }

      return {
        repositories: reposData.values,
        username: userData.username,
        accessToken,
      };
    }
  }
);

// Fetch repository structure using MCP with fallback
export const fetchRepositoryStructure = createAsyncThunk(
  'bitbucket/fetchRepositoryStructure',
  async ({ accessToken, repository }: { accessToken: string; repository: Repository }) => {
    try {
      console.log('Fetching repository structure for:', repository.full_name);
      
      // Set access token for MCP client
      bitbucketMCPClient.setAccessToken(accessToken);
      
      try {
        console.log('Attempting to fetch repository structure via Bitbucket MCP...');
        // First try to use MCP
        const structure = await bitbucketMCPClient.getRepositoryStructure(repository.full_name, '', 'main');
        console.log('Bitbucket MCP structure result:', structure);
        
        return {
          repository,
          structure: structure || [],
        };
      } catch (mcpError) {
        console.log('Bitbucket MCP failed, falling back to direct API:', mcpError);
        
        // Fallback to direct Bitbucket API
        let structure: FileNode[] = [];
        
        try {
          // First, try to get the default branch
          const repoResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!repoResponse.ok) throw new Error(`Failed to get repository info: ${repoResponse.status}`);
          const repoData = await repoResponse.json();
          const defaultBranch = repoData.mainbranch?.name || 'master';
          console.log('Default branch:', defaultBranch);
          
          // Try to get the repository structure using the default branch
          const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}/src/${defaultBranch}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) throw new Error(`Failed to get structure: ${response.status}`);
          const responseData = await response.json();
          console.log('Repository structure response:', responseData);
          structure = responseData.values || [];
        } catch (branchError: any) {
          console.log('Failed to get structure with default branch, trying without branch:', branchError.message);
          
          // If that fails, try without specifying a branch
          const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}/src`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) throw new Error(`Failed to get structure: ${response.status}`);
          const responseData = await response.json();
          console.log('Repository structure response (no branch):', responseData);
          structure = responseData.values || [];
        }
        
        return {
          repository,
          structure,
        };
      }
    } catch (error: any) {
      console.error('Error fetching repository structure:', error.message);
      throw error;
    }
  }
);

// Fetch file content using MCP with fallback
export const fetchFileContent = createAsyncThunk(
  'bitbucket/fetchFileContent',
  async ({ accessToken, repository, filePath }: { accessToken: string; repository: Repository; filePath: string }) => {
    try {
      console.log('Fetching file content for:', filePath);
      console.log('Repository:', repository.full_name);
      
      // Set access token for MCP client
      bitbucketMCPClient.setAccessToken(accessToken);
      
      let fileContent: any = null;
      
      try {
        console.log('Attempting to fetch file content via Bitbucket MCP...');
        // First try to use MCP
        fileContent = await bitbucketMCPClient.readFileContent(repository.full_name, filePath, 'main');
        console.log('Bitbucket MCP file content result:', fileContent);
      } catch (mcpError) {
        console.log('Bitbucket MCP failed, falling back to direct API:', mcpError);
        
        // Fallback to direct Bitbucket API
        try {
          // First, try to get the default branch
          const repoResponse = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!repoResponse.ok) throw new Error(`Failed to get repository info: ${repoResponse.status}`);
          const repoData = await repoResponse.json();
          const defaultBranch = repoData.mainbranch?.name || 'master';
          console.log('Default branch:', defaultBranch);
          
          // Try to fetch the file content using the default branch
          const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}/src/${defaultBranch}/${filePath}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) throw new Error(`Failed to get file content: ${response.status}`);
          const responseData = await response.json();
          console.log('File content response:', responseData);
          fileContent = responseData;
        } catch (branchError: any) {
          console.log('Failed to get file content with default branch, trying without branch:', branchError.message);
          
          // If that fails, try without specifying a branch
          const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${repository.full_name}/src/${filePath}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) throw new Error(`Failed to get file content: ${response.status}`);
          const responseData = await response.json();
          console.log('File content response (no branch):', responseData);
          fileContent = responseData;
        }
      }
      
      // Handle different response formats
      let decodedContent = '';
      let encoding = 'base64';
      let size = 0;
      let mimetype = 'text/plain';
      
      if (fileContent) {
        // Check if content is base64 encoded
        if (fileContent.content) {
          try {
            decodedContent = atob(fileContent.content);
            encoding = fileContent.encoding || 'base64';
          } catch (decodeError) {
            console.log('Failed to decode base64, treating as plain text');
            decodedContent = fileContent.content;
            encoding = 'utf-8';
          }
        } else if (typeof fileContent === 'string') {
          // Direct string content
          decodedContent = fileContent;
          encoding = 'utf-8';
        } else {
          // Try to stringify the response
          decodedContent = JSON.stringify(fileContent, null, 2);
          encoding = 'utf-8';
        }
        
        size = fileContent.size || decodedContent.length;
        mimetype = fileContent.mimetype || 'text/plain';
      }
      
      console.log('Processed file content:', {
        contentLength: decodedContent.length,
        encoding,
        size,
        mimetype
      });
      
      return {
        filePath,
        content: {
          content: decodedContent,
          encoding,
          size,
          mimetype,
        },
      };
    } catch (error: any) {
      console.error('Error fetching file content:', error.response?.data || error.message);
      throw error;
    }
  }
);

const bitbucketSlice = createSlice({
  name: 'bitbucket',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    disconnect: (state) => {
      state.repositories = [];
      state.selectedRepository = null;
      state.repositoryStructure = [];
      state.selectedFile = null;
      state.isConnected = false;
      state.username = null;
      state.accessToken = null;
      state.error = null;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearFileContent: (state) => {
      state.selectedFile = null;
    },
    clearRepositoryStructure: (state) => {
      state.repositoryStructure = [];
      state.selectedRepository = null;
    },
    setSelectedRepository: (state, action: PayloadAction<Repository>) => {
      state.selectedRepository = action.payload;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setFileTypeFilter: (state, action: PayloadAction<string>) => {
      state.fileTypeFilter = action.payload;
    },
    setSortBy: (state, action: PayloadAction<'name' | 'size' | 'modified'>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.sortOrder = action.payload;
    },
    clearFilters: (state) => {
      state.searchTerm = '';
      state.fileTypeFilter = 'all';
      state.sortBy = 'name';
      state.sortOrder = 'asc';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(exchangeCodeForToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exchangeCodeForToken.fulfilled, (state, action: PayloadAction<string>) => {
        state.accessToken = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(exchangeCodeForToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to authenticate';
        state.isConnected = false;
      })
      .addCase(fetchRepositories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRepositories.fulfilled, (state, action: PayloadAction<{ repositories: Repository[]; username: string; accessToken: string }>) => {
        state.loading = false;
        state.repositories = action.payload.repositories;
        state.isConnected = true;
        state.username = action.payload.username;
        state.accessToken = action.payload.accessToken;
        state.error = null;
      })
      .addCase(fetchRepositories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch repositories';
        state.isConnected = false;
      })
      .addCase(fetchRepositoryStructure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRepositoryStructure.fulfilled, (state, action: PayloadAction<{ repository: Repository; structure: FileNode[] }>) => {
        state.loading = false;
        state.selectedRepository = action.payload.repository;
        state.repositoryStructure = action.payload.structure;
        state.error = null;
      })
      .addCase(fetchRepositoryStructure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch repository structure';
      })
      .addCase(fetchFileContent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFileContent.fulfilled, (state, action: PayloadAction<{ filePath: string; content: FileContent }>) => {
        state.loading = false;
        state.selectedFile = action.payload.content;
        state.error = null;
      })
      .addCase(fetchFileContent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch file content';
      });
  },
});

export const { 
  clearError, 
  disconnect, 
  setAccessToken, 
  clearFileContent, 
  clearRepositoryStructure, 
  setSelectedRepository,
  setSearchTerm,
  setFileTypeFilter,
  setSortBy,
  setSortOrder,
  clearFilters
} = bitbucketSlice.actions;
export default bitbucketSlice.reducer;
