import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, id, rows = 3, className = '', ...rest }, ref) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-mono font-bold uppercase tracking-wider text-ink mb-1.5"
          >
            {label}
            {rest.required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full bg-white text-ink text-sm font-sans px-3.5 py-2.5 rounded-[8px] border-2 ${
            error ? 'border-error' : 'border-ink'
          } placeholder:text-text-muted/60 transition-all duration-120 focus:outline-none focus:border-violet focus:ring-0 focus:shadow-[0_0_0_2px_#FFF1D6,0_0_0_5px_#7A4DE0] disabled:bg-paper-dark disabled:text-text-muted disabled:cursor-not-allowed resize-y ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-error mt-1 font-mono font-medium">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-xs text-text-muted mt-1 font-mono">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
