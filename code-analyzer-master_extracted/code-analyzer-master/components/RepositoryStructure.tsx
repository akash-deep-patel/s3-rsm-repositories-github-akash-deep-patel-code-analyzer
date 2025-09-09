'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { 
  fetchRepositoryStructure, 
  fetchFileContent, 
  clearFileContent, 
  clearRepositoryStructure,
  setSearchTerm,
  setFileTypeFilter,
  setSortBy,
  setSortOrder,
  clearFilters
} from '@/lib/bitbucketSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Repository, FileNode } from '@/lib/bitbucketSlice';
import { 
  Folder, 
  File, 
  ArrowLeft, 
  Code, 
  Download, 
  Copy, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  RefreshCw,
  Eye,
  FileText,
  Image,
  Archive,
  Video,
  Music
} from 'lucide-react';

interface RepositoryStructureProps {
  repository: Repository;
  accessToken: string;
}

const RepositoryStructure: React.FC<RepositoryStructureProps> = ({ repository, accessToken }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    repositoryStructure, 
    selectedFile, 
    loading, 
    error,
    searchTerm,
    fileTypeFilter,
    sortBy,
    sortOrder
  } = useSelector((state: RootState) => state.bitbucket);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');

  // Debug: Log when selectedFile changes
  useEffect(() => {
    console.log('Selected file changed:', selectedFile);
  }, [selectedFile]);

  // Automatically load repository structure when component mounts
  useEffect(() => {
    if (repository && accessToken && repositoryStructure.length === 0) {
      console.log('Auto-loading repository structure for:', repository.name);
      dispatch(fetchRepositoryStructure({ accessToken, repository }));
    }
  }, [repository, accessToken, repositoryStructure.length, dispatch]);

  const handleViewStructure = () => {
    dispatch(fetchRepositoryStructure({ accessToken, repository }));
  };

  const handleBackToRepositories = () => {
    dispatch(clearRepositoryStructure());
    dispatch(clearFileContent());
    dispatch(clearFilters());
  };

  const handleFileClick = (filePath: string) => {
    console.log('File clicked:', filePath);
    console.log('Repository:', repository.full_name);
    console.log('Access token available:', !!accessToken);
    setCurrentFilePath(filePath);
    dispatch(fetchFileContent({ accessToken, repository, filePath }));
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string, mimetype?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (mimetype?.includes('image')) return <Image className="h-4 w-4 text-blue-500" />;
    if (mimetype?.includes('video')) return <Video className="h-4 w-4 text-purple-500" />;
    if (mimetype?.includes('audio')) return <Music className="h-4 w-4 text-green-500" />;
    if (mimetype?.includes('archive') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
      return <Archive className="h-4 w-4 text-orange-500" />;
    }
    if (['md', 'txt', 'json', 'xml', 'yaml', 'yml'].includes(extension || '')) {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'].includes(extension || '')) {
      return <Code className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const organizeStructure = (files: FileNode[]) => {
    console.log('Organizing structure for files:', files);
    const structure: { [key: string]: FileNode[] } = {};
    
    files.forEach(file => {
      console.log('Processing file:', file);
      const pathParts = file.path.split('/');
      const folder = pathParts.slice(0, -1).join('/');
      const folderKey = folder || 'root';
      
      if (!structure[folderKey]) {
        structure[folderKey] = [];
      }
      structure[folderKey].push(file);
    });

    console.log('Organized structure:', structure);
    return structure;
  };

  // Filter and sort files
  const filteredAndSortedStructure = useMemo(() => {
    if (!repositoryStructure.length) return {};

    let filteredFiles = repositoryStructure.filter(file => {
      const matchesSearch = searchTerm === '' || 
        file.path.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = fileTypeFilter === 'all' || 
        (fileTypeFilter === 'files' && file.type === 'commit_file') ||
        (fileTypeFilter === 'folders' && file.type === 'commit_directory');

      return matchesSearch && matchesFilter;
    });

    // Sort files
    filteredFiles.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.path.localeCompare(b.path);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'modified':
          comparison = (a.lastModified || '').localeCompare(b.lastModified || '');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return organizeStructure(filteredFiles);
  }, [repositoryStructure, searchTerm, fileTypeFilter, sortBy, sortOrder]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadFile = (content: string, filePath: string) => {
    // Extract the filename from the file path
    const filename = filePath.split('/').pop() || 'file.txt';
    
    // Determine the MIME type based on file extension
    const extension = filename.split('.').pop()?.toLowerCase();
    let mimeType = 'text/plain';
    
    if (['js', 'ts', 'jsx', 'tsx'].includes(extension || '')) {
      mimeType = 'application/javascript';
    } else if (['json'].includes(extension || '')) {
      mimeType = 'application/json';
    } else if (['xml'].includes(extension || '')) {
      mimeType = 'application/xml';
    } else if (['html', 'htm'].includes(extension || '')) {
      mimeType = 'text/html';
    } else if (['css'].includes(extension || '')) {
      mimeType = 'text/css';
    } else if (['md'].includes(extension || '')) {
      mimeType = 'text/markdown';
    } else if (['py'].includes(extension || '')) {
      mimeType = 'text/x-python';
    } else if (['java'].includes(extension || '')) {
      mimeType = 'text/x-java-source';
    } else if (['cpp', 'c', 'h', 'hpp'].includes(extension || '')) {
      mimeType = 'text/x-c++src';
    } else if (['php'].includes(extension || '')) {
      mimeType = 'application/x-httpd-php';
    } else if (['rb'].includes(extension || '')) {
      mimeType = 'text/x-ruby';
    } else if (['go'].includes(extension || '')) {
      mimeType = 'text/x-go';
    } else if (['rs'].includes(extension || '')) {
      mimeType = 'text/x-rust';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFileTree = (structure: { [key: string]: FileNode[] }) => {
    return Object.entries(structure).map(([folder, files]) => (
      <div key={folder} className="mb-4">
        {folder !== 'root' && (
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleFolder(folder)}
              className="p-1 h-auto hover:bg-gray-100"
            >
              <Folder className="h-4 w-4 text-yellow-500" />
              <span className="ml-1 font-medium">{folder}</span>
              <span className="text-xs text-gray-500 ml-2">({files.length} items)</span>
            </Button>
          </div>
        )}
        <div className={`ml-4 ${folder !== 'root' && !expandedFolders.has(folder) ? 'hidden' : ''}`}>
          {files.map((file) => (
                         <div key={file.path} className={`flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2 transition-colors ${
               currentFilePath === file.path ? 'bg-blue-50 border-l-2 border-blue-500' : ''
             }`}>
               {getFileIcon(file.path.split('/').pop() || '', file.mimetype)}
               <button
                 onClick={() => handleFileClick(file.path)}
                 className={`text-left hover:text-blue-600 flex-1 font-medium ${
                   currentFilePath === file.path ? 'text-blue-600 font-semibold' : ''
                 }`}
                 title={file.path}
               >
                 {file.path.split('/').pop()}
               </button>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {file.size && (
                  <span>
                    {file.size > 1024 * 1024 
                      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                      : file.size > 1024 
                        ? `${(file.size / 1024).toFixed(1)} KB` 
                        : `${file.size} B`}
                  </span>
                )}
                {file.language && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {file.language}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const stats = useMemo(() => {
    const totalFiles = repositoryStructure.filter(f => f.type === 'commit_file').length;
    const totalFolders = repositoryStructure.filter(f => f.type === 'commit_directory').length;
    const totalSize = repositoryStructure.reduce((sum, f) => sum + (f.size || 0), 0);
    
    return { totalFiles, totalFolders, totalSize };
  }, [repositoryStructure]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleBackToRepositories}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Repositories
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{repository.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Repository Structure
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {repositoryStructure.length === 0 && !loading && (
            <Button
              onClick={handleViewStructure}
              className="flex items-center gap-2"
            >
              <Code className="h-4 w-4" />
              View Structure
            </Button>
          )}
          {repositoryStructure.length > 0 && (
            <Button
              variant="outline"
              onClick={handleViewStructure}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              Loading structure...
            </div>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {repositoryStructure.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
                <CardDescription>
                  Filter and search through repository files
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch(clearFilters())}
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             {/* Search */}
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input
                   type="text"
                   placeholder="Search files..."
                   value={searchTerm}
                   onChange={(e) => dispatch(setSearchTerm(e.target.value))}
                   className="pl-10"
                 />
               </div>

                             {/* File Type Filter */}
               <Select
                 value={fileTypeFilter}
                 onChange={(e) => dispatch(setFileTypeFilter(e.target.value))}
               >
                 <option value="all">All Types</option>
                 <option value="files">Files Only</option>
                 <option value="folders">Folders Only</option>
               </Select>

                             {/* Sort By */}
               <Select
                 value={sortBy}
                 onChange={(e) => dispatch(setSortBy(e.target.value as 'name' | 'size' | 'modified'))}
               >
                 <option value="name">Sort by Name</option>
                 <option value="size">Sort by Size</option>
                 <option value="modified">Sort by Modified</option>
               </Select>

              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => dispatch(setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <span>📁 {stats.totalFolders} folders</span>
              <span>📄 {stats.totalFiles} files</span>
              <span>💾 {stats.totalSize > 1024 * 1024 
                ? `${(stats.totalSize / (1024 * 1024)).toFixed(1)} MB`
                : `${(stats.totalSize / 1024).toFixed(1)} KB`} total</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repository Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Project Structure
            </CardTitle>
            <CardDescription>
              Click on files to view their contents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repositoryStructure.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <div className="text-sm text-gray-500 mb-2">
                  Found {Object.values(filteredAndSortedStructure).flat().length} items
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
                {Object.keys(filteredAndSortedStructure).length > 0 ? (
                  renderFileTree(filteredAndSortedStructure)
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No files match your search criteria</p>
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading repository structure...</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Click "View Structure" to load the repository structure</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Content */}
        <Card>
                     <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <FileText className="h-5 w-5" />
               {currentFilePath ? currentFilePath.split('/').pop() : 'File Content'}
             </CardTitle>
             <CardDescription>
               {selectedFile ? `Viewing: ${currentFilePath}` : 'Select a file to view its contents'}
             </CardDescription>
           </CardHeader>
          <CardContent>
            {loading && !selectedFile ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading file content...</p>
              </div>
            ) : selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedFile.content)}
                      className="flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                                         <Button
                       variant="outline"
                       size="sm"
                       onClick={() => downloadFile(selectedFile.content, currentFilePath)}
                       className="flex items-center gap-2"
                     >
                       <Download className="h-4 w-4" />
                       Download
                     </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedFile.size} bytes • {selectedFile.mimetype}
                  </div>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto max-h-96">
                  <pre className="text-sm whitespace-pre-wrap">
                    {selectedFile.content || 'No content available'}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a file from the structure to view its contents</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepositoryStructure;
