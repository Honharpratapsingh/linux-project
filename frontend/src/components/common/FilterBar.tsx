import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}
