'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function GitHubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('GitHub OAuth error:', error);
      router.replace('/github?error=' + encodeURIComponent(error));
      return;
    }

    if (code) {
      // Redirect to the GitHub page with the code
      router.replace(`/github?code=${code}`);
    } else {
      // No code received, redirect back to GitHub page
      router.replace('/github');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-600" />
        <h2 className="text-xl font-semibold mb-2">Processing GitHub Authorization</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we complete the authentication...
        </p>
      </div>
    </div>
  );
}
