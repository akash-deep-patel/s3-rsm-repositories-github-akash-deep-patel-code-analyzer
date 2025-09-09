# Bitbucket Repository Explorer

A modern Next.js application that connects to Bitbucket via OAuth and provides an intuitive interface for exploring repository structures and viewing file contents.

## ✨ Features

### 🔐 **Secure OAuth Authentication**
- Seamless Bitbucket OAuth 2.0 integration
- No password storage required
- Secure token exchange via server-side API

### 📁 **Repository Management**
- List all your Bitbucket repositories
- View repository details (size, language, last updated)
- Direct links to repository pages
- Clone URLs for easy access

### 🗂️ **Advanced Repository Structure Explorer**
- **Auto-loading**: Repository structure loads automatically when selected
- **Search & Filter**: Find files quickly with real-time search
- **File Type Filtering**: Filter by files, folders, or view all
- **Smart Sorting**: Sort by name, size, or modification date
- **Visual File Icons**: Different icons for different file types (code, images, archives, etc.)
- **Folder Navigation**: Expandable folder structure with item counts

### 📄 **Enhanced File Content Viewer**
- **Syntax Highlighting**: Code files are displayed with proper formatting
- **File Information**: Shows file size, MIME type, and encoding
- **Copy & Download**: Easy content copying and file downloading
- **Fallback Handling**: Robust error handling with multiple API approaches
- **Content Decoding**: Automatic base64 decoding for Bitbucket responses

### ☁️ **AWS S3 Repository Downloads**
- **Secure Downloads**: Download repositories as ZIP files via AWS S3
- **Presigned URLs**: Secure, time-limited download links
- **Automatic Cleanup**: Temporary files are cleaned up after processing
- **Error Handling**: Comprehensive error handling and user feedback
- **Configuration Validation**: Automatic validation of AWS credentials

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works perfectly on desktop and mobile
- **Dark/Light Theme Support**: Built with Tailwind CSS
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages
- **Keyboard Navigation**: Full keyboard accessibility

### 🔧 **Developer Experience**
- **TypeScript**: Full type safety throughout the application
- **Redux Toolkit**: Efficient state management
- **Component Library**: Built with shadcn/ui components
- **Hot Reload**: Fast development with Next.js

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Bitbucket account with OAuth consumer access

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd code-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your Bitbucket OAuth credentials:
   ```env
   NEXT_PUBLIC_BITBUCKET_CLIENT_ID=your_client_id_here
   BITBUCKET_CLIENT_SECRET=your_client_secret_here
   NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
   REDIRECT_URI=http://localhost:3000/auth/callback
   ```

4. **Set up AWS S3 (for repository downloads)**
   ```bash
   # Automated setup
   npm run setup-aws
   
   # Or test your configuration
   npm run test-aws
   ```

5. **Start the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Bitbucket OAuth Setup

### Creating an OAuth Consumer

1. Go to your Bitbucket workspace settings:
   - Navigate to `https://bitbucket.org/workspace/settings/`
   - Or go to your profile → Workspace settings → OAuth consumers

2. Click "Add consumer" and configure:
   - **Name**: `Code Analyzer` (or any name you prefer)
   - **Callback URL**: `http://localhost:3000/auth/callback`
   - **Permissions**: 
     - ✅ **Repositories: Read**
     - ✅ **Pull requests: Read**
     - ✅ **Issues: Read**

3. Copy the **Key** and **Secret** to your `.env.local` file

## 📖 Usage

### Connecting to Bitbucket
1. Click the "Connect with Bitbucket" button
2. Authorize the application in the Bitbucket OAuth flow
3. You'll be redirected back to see your repositories

### Exploring Repositories
1. **View Repository**: Click "View" to open the repository in Bitbucket
2. **Explore Structure**: Click "Structure" to see the repository's file structure
3. **Search Files**: Use the search bar to find specific files
4. **Filter Content**: Use the dropdown to filter by file types
5. **Sort Results**: Sort files by name, size, or modification date

### Viewing File Contents
1. Click on any file in the structure to view its contents
2. Use the "Copy" button to copy content to clipboard
3. Use the "Download" button to save the file locally
4. File information (size, type) is displayed at the top

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Authentication**: OAuth 2.0

## 📁 Project Structure

```
code-analyzer/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # OAuth callback handling
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── BitbucketConnect.tsx
│   ├── RepositoryStructure.tsx
│   └── Providers.tsx
├── lib/                  # Utilities and configuration
│   ├── bitbucketSlice.ts # Redux slice for Bitbucket state
│   ├── store.ts          # Redux store configuration
│   └── utils.ts          # Utility functions
└── public/               # Static assets
```

## 🔒 Security Features

- **Server-side OAuth**: Token exchange happens on the server
- **Environment Variables**: Sensitive data stored in `.env.local`
- **No Password Storage**: Only OAuth tokens are used
- **Secure Headers**: Proper authorization headers for API calls
- **Error Handling**: No sensitive information in error messages

## 🐛 Troubleshooting

### Common Issues

**"POST /api/auth/callback 500"**
- Check that all environment variables are set correctly
- Ensure the callback URL matches exactly
- Verify your OAuth consumer has the correct permissions

**"View Structure Fails"**
- The app automatically retries with different API endpoints
- Check browser console for detailed error messages
- Ensure your repository has files in the default branch

**"File Content Display Fails"**
- The app handles multiple content formats automatically
- Check browser console for API response details
- Large files may take longer to load

### Debug Mode
Open browser developer tools to see detailed console logs for:
- API requests and responses
- File processing steps
- Error details and fallback attempts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
