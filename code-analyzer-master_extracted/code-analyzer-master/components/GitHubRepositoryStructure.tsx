'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { 
  clearSelectedRepository, 
  setCurrentPath, 
  fetchRepositoryStructure, 
  fetchFileContent
} from '@/lib/githubSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitHubRepository, GitHubFile } from '@/lib/githubSlice';
import { 
  ArrowLeft, 
  Folder, 
  File, 
  Download, 
  Loader2, 
  Code,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface GitHubRepositoryStructureProps {
  repository: GitHubRepository;
  accessToken: string;
}

const GitHubRepositoryStructure: React.FC<GitHubRepositoryStructureProps> = ({
  repository,
  accessToken
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { repositoryStructure, currentPath, fileContent, fileLoading, error } = useSelector(
    (state: RootState) => state.github
  );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load repository structure when component mounts
    loadRepositoryStructure();
  }, [repository, currentPath]);

  const loadRepositoryStructure = async () => {
    try {
      await dispatch(fetchRepositoryStructure({
        repoFullName: repository.full_name,
        path: currentPath,
        branch: repository.default_branch
      }));
    } catch (error) {
      console.error('Failed to load repository structure:', error);
    }
  };

  const handleFileClick = async (file: GitHubFile) => {
    if (file.type === 'dir') {
      // Navigate to directory
      const newPath = currentPath ? `${currentPath}/${file.name}` : file.name;
      dispatch(setCurrentPath(newPath));
      setSelectedFile(null);
    } else {
      // Load file content
      setSelectedFile(file.path);
      try {
        await dispatch(fetchFileContent({
          repoFullName: repository.full_name,
          filePath: file.path,
          branch: repository.default_branch
        }));
      } catch (error) {
        console.error('Failed to load file content:', error);
      }
    }
  };

  const handleBackClick = () => {
    if (currentPath) {
      const pathParts = currentPath.split('/');
      pathParts.pop();
      const newPath = pathParts.join('/');
      dispatch(setCurrentPath(newPath));
      setSelectedFile(null);
    }
  };

  const downloadFile = (file: GitHubFile) => {
    if (file.download_url) {
      const link = document.createElement('a');
      link.href = file.download_url;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <Code className="h-4 w-4 text-yellow-500" />;
      case 'md':
        return <File className="h-4 w-4 text-blue-500" />;
      case 'json':
        return <File className="h-4 w-4 text-green-500" />;
      case 'css':
      case 'scss':
        return <File className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => dispatch(clearSelectedRepository())}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Repositories
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{repository.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{repository.description}</p>
          </div>
        </div>
                 <div className="flex items-center gap-2">
           <Button
             variant="outline"
             onClick={() => window.open(repository.html_url, '_blank')}
             className="flex items-center gap-2"
           >
             <ExternalLink className="h-4 w-4" />
             View on GitHub
           </Button>
         </div>
      </div>

      {/* Breadcrumb */}
      {currentPath && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Path:</span>
          <span className="font-mono">{currentPath}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Repository Structure
            </CardTitle>
            <CardDescription>
              Navigate through files and folders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {repositoryStructure.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center gap-3">
                      {file.type === 'dir' ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                      ) : (
                        getFileIcon(file.name)
                      )}
                      <span className="font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.type === 'file' && (
                        <span className="text-sm text-gray-500">
                          {formatSize(file.size)}
                        </span>
                      )}
                      {file.type === 'file' && file.download_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(file);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {repositoryStructure.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No files found in this directory
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Content */}
        {selectedFile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <File className="h-5 w-5" />
                {selectedFile.split('/').pop()}
              </CardTitle>
              <CardDescription>
                File content viewer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {fileContent ? `${fileContent.length} characters` : 'No content'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(fileContent || '', 'content')}
                      className="flex items-center gap-2"
                    >
                      {copiedUrl === 'content' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedUrl === 'content' ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{fileContent || 'No content available'}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GitHubRepositoryStructure;
