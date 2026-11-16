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
      {breadcrumbs && <div className="mb-2.5">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[48px] leading-tight text-ink tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="font-sans text-base text-text-secondary mt-1.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">{actions}</div>}
      </div>
    </div>
  );
}
