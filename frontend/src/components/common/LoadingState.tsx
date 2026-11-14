import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  fullScreen = false,
}: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
      <p className="text-sm font-sans text-text-secondary">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
