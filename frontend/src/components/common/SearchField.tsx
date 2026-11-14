import { Search, X } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search...',
  label = 'Search',
  className = '',
}: SearchFieldProps) {
  const inputId = `search-${placeholder.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none" />
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface text-text text-sm font-sans pl-9 pr-8 py-2 rounded-md border border-border placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-focus/30 focus:border-focus"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 text-text-muted hover:text-text p-0.5 rounded transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
