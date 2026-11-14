import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
      <div className="bg-surface border border-border rounded-xl p-8 sm:p-12 max-w-md w-full shadow-xs">
        <div className="w-12 h-12 rounded-full bg-sidebar text-text-muted flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-semibold text-text mb-2">
          Page Not Found
        </h1>
        <p className="font-sans text-sm text-text-secondary mb-6 leading-relaxed">
          The page or resource you requested could not be found or may have been moved.
        </p>
        <Link to="/overview">
          <Button variant="primary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
