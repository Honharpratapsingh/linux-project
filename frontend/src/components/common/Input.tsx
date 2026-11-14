import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...rest }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-sans font-medium text-text mb-1.5"
          >
            {label}
            {rest.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-surface text-text text-sm font-sans px-3 py-2 rounded-md border ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-focus focus:ring-focus/30'
          } placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-sidebar disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-error mt-1 font-sans">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-text-muted mt-1 font-sans">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
