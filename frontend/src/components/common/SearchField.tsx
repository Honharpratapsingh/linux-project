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
      <Search className="w-4 h-4 text-text-muted absolute left-3 pointer-events-none stroke-[2.5]" />
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white text-ink text-sm font-sans pl-9 pr-8 py-2 rounded-lg border-2 border-ink placeholder:text-text-muted/60 transition-all duration-120 focus:outline-none focus:border-violet focus:ring-0 focus:shadow-[0_0_0_2px_#FFF1D6,0_0_0_5px_#7A4DE0]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 text-text-muted hover:text-ink p-0.5 rounded transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
