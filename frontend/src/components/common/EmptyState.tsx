import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-surface border border-dashed border-border rounded-lg p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-sidebar flex items-center justify-center text-text-muted mb-3.5">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="font-serif text-lg font-medium text-text mb-1.5">{title}</h3>
      {description && (
        <p className="font-sans text-sm text-text-secondary max-w-sm mb-5">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
