import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 sm:mb-8 ${className}`}>
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-text tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="font-sans text-sm text-text-secondary mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
