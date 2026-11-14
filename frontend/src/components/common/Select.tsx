import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className = '', ...rest }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-sans font-medium text-text mb-1.5"
          >
            {label}
            {rest.required && <span className="text-error ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full bg-surface text-text text-sm font-sans px-3 py-2 rounded-md border ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-focus focus:ring-focus/30'
          } transition-colors duration-150 focus:outline-none focus:ring-2 disabled:bg-sidebar disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-error mt-1 font-sans">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
