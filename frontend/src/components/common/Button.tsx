import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'approve';
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
    'inline-flex items-center justify-center font-sans font-bold border-2 rounded-lg transition-all duration-120 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-violet focus-visible:outline-offset-2 disabled:bg-paper-dark disabled:text-text-muted disabled:border-dashed disabled:border-ink/50 disabled:shadow-none disabled:cursor-not-allowed select-none active:disabled:translate-x-0 active:disabled:translate-y-0';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-primary text-white border-ink shadow-[3px_3px_0_0_#1B1410] hover:bg-primary-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#1B1410]',
    secondary:
      'bg-surface text-ink border-ink shadow-[3px_3px_0_0_#1B1410] hover:bg-paper-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#1B1410]',
    outline:
      'bg-surface text-ink border-ink shadow-[3px_3px_0_0_#1B1410] hover:bg-paper-dark active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#1B1410]',
    danger:
      'bg-surface text-error border-error shadow-[3px_3px_0_0_#1B1410] hover:bg-error/10 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#1B1410]',
    ghost:
      'bg-transparent text-ink border-transparent hover:bg-ink/10 active:bg-ink/20',
    approve:
      'bg-lime text-ink border-ink shadow-[3px_3px_0_0_#1B1410] hover:bg-lime/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_#1B1410]',
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
