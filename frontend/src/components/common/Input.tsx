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
            className="block text-xs font-mono font-bold uppercase tracking-wider text-ink mb-1.5"
          >
            {label}
            {rest.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-white text-ink text-sm font-sans px-3.5 py-2.5 rounded-[8px] border-2 ${
            error ? 'border-error' : 'border-ink'
          } placeholder:text-text-muted/60 transition-all duration-120 focus:outline-none focus:border-violet focus:ring-0 focus:shadow-[0_0_0_2px_#FFF1D6,0_0_0_5px_#7A4DE0] disabled:bg-paper-dark disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-error mt-1 font-mono font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-text-muted mt-1 font-mono">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
