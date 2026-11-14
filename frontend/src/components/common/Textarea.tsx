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
            className="block text-xs font-sans font-medium text-text mb-1.5"
          >
            {label}
            {rest.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full bg-surface text-text text-sm font-sans px-3 py-2 rounded-md border ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-focus focus:ring-focus/30'
          } placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-sidebar disabled:text-text-muted disabled:cursor-not-allowed resize-y ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-error mt-1 font-sans">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="text-xs text-text-muted mt-1 font-sans">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
