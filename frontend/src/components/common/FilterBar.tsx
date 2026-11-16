import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div
      className={`card-hard-static bg-white p-3.5 sm:p-4 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}
