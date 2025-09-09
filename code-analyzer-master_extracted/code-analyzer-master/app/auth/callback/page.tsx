'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/lib/store';
import { exchangeCodeForToken, fetchRepositories } from '@/lib/bitbucketSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, accessToken } = useSelector((state: RootState) => state.bitbucket);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      router.push('/?error=oauth_failed');
      return;
    }

    if (code && !accessToken) {
      handleOAuthCallback(code);
    }
  }, [searchParams, accessToken, dispatch, router]);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchRepositories(accessToken)).then(() => {
        router.push('/');
      });
    }
  }, [accessToken, dispatch, router]);

  const handleOAuthCallback = async (code: string) => {
    try {
      await dispatch(exchangeCodeForToken(code)).unwrap();
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
      router.push('/?error=token_exchange_failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to Bitbucket...
            </CardTitle>
            <CardDescription>
              Please wait while we authenticate your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Failed</CardTitle>
            <CardDescription>
              There was an error connecting to Bitbucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
