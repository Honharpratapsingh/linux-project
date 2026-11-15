import { ProjectStatus } from '../../types/api';
import { formatStatusLabel } from '../../lib/status';

interface StatusBadgeProps {
  status: ProjectStatus;
  isArchived?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { bgClass: string; textClass: string }
> = {
  COMPLETED: {
    bgClass: 'bg-sage',
    textClass: 'text-text',
  },
  PENDING_REVIEW: {
    bgClass: 'bg-lavender',
    textClass: 'text-text',
  },
  IN_PROGRESS: {
    bgClass: 'bg-blue',
    textClass: 'text-text',
  },
  CHANGES_REQUESTED: {
    bgClass: 'bg-peach',
    textClass: 'text-text',
  },
  REJECTED: {
    bgClass: 'bg-error/20',
    textClass: 'text-error',
  },
  DRAFT: {
    bgClass: 'bg-divider',
    textClass: 'text-text-muted',
  },
};

export function StatusBadge({ status, isArchived, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const label = formatStatusLabel(status);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        data-testid={`badge-${status}`}
        className={`font-sans text-xs px-2.5 py-0.5 rounded-full font-medium tracking-wide ${config.bgClass} ${config.textClass}`}
      >
        {label}
      </span>
      {isArchived && (
        <span
          data-testid="badge-archived"
          className="font-sans text-xs px-2 py-0.5 rounded-full font-medium tracking-wide border border-text-muted/40 text-text-muted bg-transparent"
        >
          Archived
        </span>
      )}
    </div>
  );
}
