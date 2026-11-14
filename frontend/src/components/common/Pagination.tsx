import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total <= 0) return null;

  return (
    <div
      className={`flex items-center justify-between border-t border-divider px-3 py-3 sm:px-4 text-xs text-text-secondary ${className}`}
      aria-label="Pagination Navigation"
    >
      <div className="flex items-center gap-1">
        <span>Showing</span>
        <span className="font-medium text-text">
          {Math.min(total, (page - 1) * pageSize + 1)}
        </span>
        <span>to</span>
        <span className="font-medium text-text">
          {Math.min(total, page * pageSize)}
        </span>
        <span>of</span>
        <span className="font-medium text-text">{total}</span>
        <span>results</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block">
          Page <span className="font-medium text-text">{page}</span> of{' '}
          <span className="font-medium text-text">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            icon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            icon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
