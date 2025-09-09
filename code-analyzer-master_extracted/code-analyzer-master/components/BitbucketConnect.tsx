'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { RootState, AppDispatch } from '@/lib/store';
import { getOAuthUrl, disconnect, clearError, setSelectedRepository } from '@/lib/bitbucketSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Repository } from '@/lib/bitbucketSlice';
import { GitBranch, Globe, Lock, Calendar, Code, ExternalLink, Loader2, Folder, Copy, Check, Info } from 'lucide-react';
import RepositoryStructure from './RepositoryStructure';

const BitbucketConnect: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { repositories, loading, error, isConnected, username, selectedRepository, accessToken } = useSelector(
    (state: RootState) => state.bitbucket
  );
  
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastCopiedCommand, setLastCopiedCommand] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      // Handle OAuth errors
      console.error('OAuth error:', errorParam);
    }
  }, [searchParams]);

  const handleConnect = () => {
    const oauthUrl = getOAuthUrl();
    window.location.href = oauthUrl;
  };

  const handleDisconnect = () => {
    dispatch(disconnect());
  };

  const handleDebugRepo = async (repo: Repository) => {
    try {
      console.log('Debugging repository:', repo);
      
      const response = await fetch('/api/debug-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: repo,
        }),
      });

      const data = await response.json();
      console.log('Debug response:', data);
      alert(`Debug data logged to console. Check browser console for details.`);
      
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Debug failed. Check console for details.');
    }
  };

  const handleDownloadRepo = async (repo: Repository) => {
    try {
      // Show loading state
      setCopiedUrl(`${repo.full_name}-download`);
      
      if (!accessToken) {
        alert('Authentication required for repository download. Please reconnect to Bitbucket.');
        setCopiedUrl(null);
        return;
      }

      // Debug: Log repository data being sent
      console.log('Repository data being sent to API:', {
        name: repo.name,
        full_name: repo.full_name,
        links: repo.links,
        clone_url: repo.clone_url,
        size: repo.size,
        language: repo.language
      });

      // Call our API route that will handle the download process
      const response = await fetch('/api/download-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: repo,
          accessToken: accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Check if we have a download URL
        if (data.downloadUrl) {
          console.log('Download URL generated:', data.downloadUrl);
          
          // Create a temporary link and trigger download
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `${data.repository.name}-${data.repository.defaultBranch}.zip`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
                                // Show success message
           const overwriteInfo = data.awsS3Info.overwrote 
             ? '\n⚠️  Previous version was overwritten with the latest code.'
             : '\n✅ New file created in AWS S3.';
           
           const message = `Repository downloaded successfully!\n\n` +
             `Repository: ${data.repository.name}\n` +
             `Default Branch: ${data.repository.defaultBranch}\n` +
             `Size: ${formatSize(data.repository.size)}\n` +
             `Language: ${data.repository.language || 'Not specified'}\n\n` +
             `The ZIP file has been uploaded to AWS S3 and is ready for download.` +
             `${overwriteInfo}\n` +
             `Download URL expires in 1 hour.\n\n` +
             `📥 Download Commands:\n` +
             `• AWS CLI: ${data.downloadCommands.awsCli} (will be copied automatically)\n` +
             `• cURL: ${data.downloadCommands.curl}\n` +
             `• wget: ${data.downloadCommands.wget}\n` +
             `• PowerShell: ${data.downloadCommands.powershell}\n\n` +
             `💡 To copy other commands, use the console commands below.`;
           
           alert(message);
           
           // Automatically copy AWS CLI command to clipboard after alert
           setTimeout(() => {
             copyToClipboard(data.downloadCommands.awsCli, 'AWS CLI');
             console.log('✅ AWS CLI command automatically copied to clipboard!');
             console.log('📋 You can now paste the command in your terminal');
             console.log('💡 For other commands, use the copyToClipboard() functions in the console above');
           }, 100);
           
           // Also log the commands to console for easy copying
           console.log('📥 Download Commands:');
           console.log('AWS CLI:', data.downloadCommands.awsCli);
           console.log('cURL:', data.downloadCommands.curl);
           console.log('wget:', data.downloadCommands.wget);
           console.log('PowerShell:', data.downloadCommands.powershell);
           console.log('\n💡 Tip: You can copy these commands from the console and paste them in your terminal.');
           console.log('💡 Tip: The AWS CLI command requires AWS credentials to be configured.');
           
           // Create interactive copy commands in console
           console.log('\n🔄 Copy Commands (run these in console to copy to clipboard):');
           console.log('• Copy AWS CLI command: copyToClipboard("' + data.downloadCommands.awsCli.replace(/"/g, '\\"') + '", "AWS CLI")');
           console.log('• Copy cURL command: copyToClipboard("' + data.downloadCommands.curl.replace(/"/g, '\\"') + '", "cURL")');
           console.log('• Copy wget command: copyToClipboard("' + data.downloadCommands.wget.replace(/"/g, '\\"') + '", "wget")');
           console.log('• Copy PowerShell command: copyToClipboard("' + data.downloadCommands.powershell.replace(/"/g, '\\"') + '", "PowerShell")');
           
           // Make copyToClipboard function globally available for console use
           (window as any).copyToClipboard = copyToClipboard;
           console.log('\n💡 The copyToClipboard function is now available globally. You can use it directly in the console.');
           
          console.log('Repository downloaded successfully:', data.repository);
          console.log('AWS S3 info:', data.awsS3Info);
        } else {
          alert('Download URL not generated. Please try again.');
        }
      } else {
        // Handle missing credentials
        if (data.missingCredentials) {
          const missingVars = Object.entries(data.missingCredentials)
            .filter(([_, missing]) => missing)
            .map(([varName, _]) => varName)
            .join(', ');
          
          alert(`AWS S3 integration not configured. Missing environment variables: ${missingVars}\n\nPlease add these to your .env.local file.`);
        } else {
          alert(data.message || 'Failed to download repository. Please try again.');
        }
      }
      
      // Reset the feedback after 3 seconds
      setTimeout(() => {
        setCopiedUrl(null);
      }, 3000);
      
    } catch (error) {
      console.error('Failed to process repository download:', error);
      alert('Repository download feature is being migrated to AWS S3 for better reliability.');
      setCopiedUrl(null);
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setLastCopiedCommand(label);
      console.log(`✅ ${label} command copied to clipboard!`);
      
      // Reset the copied command indicator after 3 seconds
      setTimeout(() => {
        setLastCopiedCommand(null);
      }, 3000);
    } catch (error) {
      console.error(`Failed to copy ${label} command:`, error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Bitbucket Repository Manager</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect to your Bitbucket account and view your repositories
        </p>
      </div>

             {!isConnected ? (
         <Card className="max-w-md mx-auto">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <GitBranch className="h-5 w-5" />
               Connect to Bitbucket
             </CardTitle>
             <CardDescription>
               Securely connect to your Bitbucket account using OAuth
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="text-center">
               <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                 Click the button below to securely authenticate with Bitbucket. 
                 You'll be redirected to Bitbucket to authorize this application.
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
                   <GitBranch className="h-4 w-4 mr-2" />
                   Connect with Bitbucket
                 </>
                            )}
           </Button>
           <div className="text-xs text-gray-500 text-center">
             <p>🔒 Your credentials are never stored</p>
             <p>⚡ One-click authentication</p>
             <p>🔄 Automatic token refresh</p>
           </div>
         </CardContent>
       </Card>
     ) : selectedRepository ? (
       <RepositoryStructure repository={selectedRepository} accessToken={accessToken!} />
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
                    <li>• <strong>View:</strong> Open repository in Bitbucket web interface</li>
                    <li>• <strong>Structure:</strong> Explore repository files and folders</li>
                                         <li>• <strong>Download ZIP:</strong> Download repository as ZIP file via AWS S3</li>
                  </ul>
               </div>
             </div>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repositories.map((repo: Repository) => {
              // Debug: Log the first repository to see the structure
              if (repositories.indexOf(repo) === 0) {
                console.log('First repository data:', repo);
              }
              return (
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
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          // Construct the proper Bitbucket repository URL
                          const repoUrl = `https://bitbucket.org/${repo.full_name}`;
                          window.open(repoUrl, '_blank');
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
                                             <div className="flex-1">
                                                 <Button
                           variant="outline"
                           size="sm"
                           className="w-full"
                           onClick={() => handleDownloadRepo(repo)}
                           title={`Download ${repo.name} as ZIP file`}
                         >
                           {copiedUrl === `${repo.full_name}-download` ? (
                             <Check className="h-4 w-4 mr-1 text-green-600" />
                           ) : (
                             <Code className="h-4 w-4 mr-1" />
                           )}
                                                       {copiedUrl === `${repo.full_name}-download` ? 'Processing...' : 'Download ZIP'}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="w-full mt-1"
                           onClick={() => handleDebugRepo(repo)}
                           title={`Debug ${repo.name} data`}
                         >
                           Debug
                         </Button>
                        
                        
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            })}
          </div>

          {repositories.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <GitBranch className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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

export default BitbucketConnect;
