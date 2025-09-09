'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GitBranch, Github } from 'lucide-react';

const Navigation: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              Repository Manager
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button
                  variant={pathname === '/' ? 'default' : 'ghost'}
                  className="flex items-center gap-2"
                >
                  <GitBranch className="h-4 w-4" />
                  Bitbucket
                </Button>
              </Link>
              <Link href="/github">
                <Button
                  variant={pathname === '/github' ? 'default' : 'ghost'}
                  className="flex items-center gap-2"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
