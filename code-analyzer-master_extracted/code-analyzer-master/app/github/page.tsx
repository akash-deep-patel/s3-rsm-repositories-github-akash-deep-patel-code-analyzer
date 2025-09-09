import GitHubConnect from '@/components/GitHubConnect';
import Navigation from '@/components/Navigation';

export default function GitHubPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <GitHubConnect />
    </div>
  );
}
