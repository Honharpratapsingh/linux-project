import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`bg-surface border border-error/20 rounded-lg p-6 sm:p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="font-serif text-lg font-medium text-text mb-1">{title}</h3>
      <p className="font-sans text-sm text-text-secondary mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
