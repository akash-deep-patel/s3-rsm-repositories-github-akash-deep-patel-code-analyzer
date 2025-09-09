'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState, AppDispatch } from '@/lib/store';
import { 
  getGitHubOAuthUrl, 
  disconnect, 
  clearError, 
  setSelectedRepository,
  exchangeGitHubCode,
  fetchGitHubUser,
  fetchGitHubRepositories
} from '@/lib/githubSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitHubRepository } from '@/lib/githubSlice';
import { 
  GitBranch, 
  Globe, 
  Lock, 
  Calendar, 
  Code, 
  ExternalLink, 
  Loader2, 
  Folder, 
  Star,
  GitFork,
  Info,
  Github,
  Archive,
  Check
} from 'lucide-react';
import GitHubRepositoryStructure from './GitHubRepositoryStructure';

const GitHubConnect: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    repositories, 
    loading, 
    error, 
    isConnected, 
    username, 
    selectedRepository, 
    accessToken 
  } = useSelector((state: RootState) => state.github);

  const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: 'idle' | 'downloading' | 'success' | 'error' }>({});
  const [lastCopiedCommand, setLastCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('GitHub OAuth error:', errorParam);
      // Clear the error from URL after logging
      router.replace('/github');
      return;
    }

    if (code && !isConnected) {
      handleOAuthCallback(code);
    }
  }, [searchParams, isConnected, router]);

  // Fetch repositories if already connected but no repositories loaded
  useEffect(() => {
    if (isConnected && accessToken && repositories.length === 0 && !loading) {
      console.log('Fetching repositories for already connected user');
      dispatch(fetchGitHubRepositories(accessToken));
    }
  }, [isConnected, accessToken, repositories.length, loading, dispatch]);

  const handleOAuthCallback = async (code: string) => {
    try {
      // Exchange code for access token
      const tokenResult = await dispatch(exchangeGitHubCode(code));
      
      if (exchangeGitHubCode.fulfilled.match(tokenResult)) {
        const accessToken = tokenResult.payload.access_token;
        
        // Fetch user data
        await dispatch(fetchGitHubUser(accessToken));
        
        // Fetch repositories
        await dispatch(fetchGitHubRepositories(accessToken));
        
        // Clear the URL parameters
        router.replace('/github');
      }
    } catch (error) {
      console.error('OAuth callback failed:', error);
    }
  };

  const handleConnect = () => {
    const oauthUrl = getGitHubOAuthUrl();
    window.location.href = oauthUrl;
  };

  const handleDisconnect = () => {
    dispatch(disconnect());
  };

  const handleDownloadZip = async (repo: GitHubRepository) => {
    try {
      setDownloadStatus(prev => ({ ...prev, [repo.full_name]: 'downloading' }));
      
      // Call the GitHub download API route
      const response = await fetch('/api/github/download-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: repo,
          accessToken: accessToken
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download repository');
      }

      const result = await response.json();
      setDownloadStatus(prev => ({ ...prev, [repo.full_name]: 'success' }));

      // Show success message with download commands
      const overwriteNote = result.wasOverwrite ? '\n🔄 Previous version was overwritten' : '';
      const message = `
${result.message}${overwriteNote}

📥 Download Commands Available:

AWS CLI: ${result.downloadCommands.awsCli} (will be copied automatically)
cURL: ${result.downloadCommands.curl}
wget: ${result.downloadCommands.wget}
PowerShell: ${result.downloadCommands.powershell}

Check the console for other copy commands!
      `;

      // Make copyToClipboard globally available
      (window as any).copyToClipboard = copyToClipboard;

      // Log interactive copy commands to console
      console.log('=== GitHub Repository Download Commands ===');
      console.log('Copy any of these commands to download the repository:');
      console.log('');
      console.log('AWS CLI:');
      console.log(`copyToClipboard('${result.downloadCommands.awsCli}')`);
      console.log('');
      console.log('cURL:');
      console.log(`copyToClipboard('${result.downloadCommands.curl}')`);
      console.log('');
      console.log('wget:');
      console.log(`copyToClipboard('${result.downloadCommands.wget}')`);
      console.log('');
      console.log('PowerShell:');
      console.log(`copyToClipboard('${result.downloadCommands.powershell}')`);
      console.log('');
      console.log('=== End Commands ===');

      // Show alert and automatically copy AWS CLI command to clipboard
      alert(message);
      
      // Automatically copy AWS CLI command to clipboard after alert
      setTimeout(() => {
        copyToClipboard(result.downloadCommands.awsCli);
        console.log('✅ AWS CLI command automatically copied to clipboard!');
        console.log('📋 You can now paste the command in your terminal');
        console.log('💡 For other commands, use the copyToClipboard() functions in the console above');
      }, 100);
      
    } catch (error) {
      console.error('Failed to download repository:', error);
      setDownloadStatus(prev => ({ ...prev, [repo.full_name]: 'error' }));
      alert(`Failed to download repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTimeout(() => {
        setDownloadStatus(prev => ({ ...prev, [repo.full_name]: 'idle' }));
      }, 3000);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLastCopiedCommand(text);
      setTimeout(() => setLastCopiedCommand(null), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">GitHub Repository Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect to your GitHub account and explore your repositories
        </p>
      </div>

      {!isConnected ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Connect to GitHub
            </CardTitle>
            <CardDescription>
              Securely connect to your GitHub account using OAuth
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Click the button below to securely authenticate with GitHub. 
                You'll be redirected to GitHub to authorize this application.
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <Button
              onClick={handleConnect}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="h-4 w-4 mr-2" />
                  Connect with GitHub
                </>
              )}
            </Button>
            <div className="text-xs text-gray-500 text-center">
              <p>🔒 Your credentials are never stored</p>
              <p>⚡ One-click authentication</p>
              <p>🔄 Access to your repositories</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedRepository ? (
        <GitHubRepositoryStructure repository={selectedRepository} accessToken={accessToken!} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Welcome, {username}! 👋
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Here are your repositories ({repositories.length} found)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="flex items-center gap-2"
            >
              Disconnect
            </Button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Repository Actions Available:</p>
                                 <ul className="space-y-1 text-xs">
                   <li>• <strong>View:</strong> Open repository in GitHub web interface</li>
                   <li>• <strong>Structure:</strong> Explore repository files and folders via MCP</li>
                   <li>• <strong>Download ZIP:</strong> Clone repository and upload to S3 for download</li>
                 </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo: GitHubRepository) => (
              <Card key={repo.full_name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {repo.private ? (
                          <Lock className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-gray-500" />
                        )}
                        {repo.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {repo.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Language:</span>
                      <span className="font-medium">
                        {repo.language || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-medium">{formatSize(repo.size)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Updated:</span>
                      <span className="font-medium">{formatDate(repo.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span>{repo.stargazers_count}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitFork className="h-3 w-3 text-blue-500" />
                        <span>{repo.forks_count}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          window.open(repo.html_url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          dispatch(setSelectedRepository(repo));
                        }}
                      >
                        <Folder className="h-4 w-4 mr-1" />
                        Structure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadZip(repo)}
                        disabled={downloadStatus[repo.full_name] === 'downloading'}
                      >
                        {downloadStatus[repo.full_name] === 'downloading' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : downloadStatus[repo.full_name] === 'success' ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Archive className="h-4 w-4 mr-1" />
                        )}
                        {downloadStatus[repo.full_name] === 'downloading' ? 'Downloading...' : 
                         downloadStatus[repo.full_name] === 'success' ? 'Downloaded!' : 
                         'Download ZIP'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {repositories.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Github className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No repositories found</h3>
                <p className="text-gray-500">
                  You don't have any repositories or the credentials don't have access to them.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default GitHubConnect;
