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
      className={`card-hard-static bg-white border-2 border-error p-6 sm:p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 shadow-[5px_5px_0_0_#B3261E] ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-error/15 border-2 border-error flex items-center justify-center text-error mb-3 shadow-[2px_2px_0_0_#B3261E]">
        <AlertCircle className="w-6 h-6 stroke-[2.5]" />
      </div>
      <h3 className="font-display font-black text-xl text-ink mb-1">{title}</h3>
      <p className="font-sans text-sm text-text-secondary mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
