import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-sans font-medium transition-colors duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-focus/40 focus:border-focus disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-primary text-surface hover:bg-primary-hover active:bg-primary-hover border border-transparent shadow-sm',
    secondary:
      'bg-sidebar text-text hover:bg-divider border border-border/80 shadow-xs',
    outline:
      'bg-surface text-text hover:bg-sidebar border border-border shadow-xs',
    danger:
      'bg-error text-surface hover:opacity-90 border border-transparent shadow-sm',
    ghost:
      'bg-transparent text-text hover:bg-sidebar/80 active:bg-sidebar border border-transparent',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
