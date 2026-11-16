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
      className={`card-hard-static bg-white border-2 border-dashed border-ink p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto ${className}`}
    >
      {/* Bold CSS Shape container */}
      <div className="w-16 h-16 rounded-[12px] bg-marigold border-2 border-ink shadow-[3px_3px_0_0_#1B1410] flex items-center justify-center text-ink mb-4">
        {icon || <FolderOpen className="w-8 h-8 stroke-[2.5]" />}
      </div>
      <h3 className="font-display font-black text-2xl sm:text-3xl text-ink mb-2 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="font-sans text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
