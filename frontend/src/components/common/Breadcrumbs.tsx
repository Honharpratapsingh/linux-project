import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs text-text-muted ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-border shrink-0" />}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="hover:text-text transition-colors duration-150"
              >
                {item.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[200px] ${isLast ? 'text-text font-medium' : ''}`}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
