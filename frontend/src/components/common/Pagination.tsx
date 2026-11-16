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
      className={`flex items-center justify-between border-t-2 border-ink px-4 py-3 bg-paper text-xs font-mono text-text-secondary ${className}`}
      aria-label="Pagination Navigation"
    >
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
        <span>Showing</span>
        <span className="text-ink">
          {Math.min(total, (page - 1) * pageSize + 1)}
        </span>
        <span>to</span>
        <span className="text-ink">
          {Math.min(total, page * pageSize)}
        </span>
        <span>of</span>
        <span className="text-ink">{total}</span>
        <span>results</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block font-bold uppercase tracking-wider text-[11px]">
          Page <span className="text-ink">{page}</span> of{' '}
          <span className="text-ink">{totalPages}</span>
        </span>
        <div className="flex items-center gap-1.5">
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
