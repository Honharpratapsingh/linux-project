import { ProjectStatus } from '../../types/api';

interface StatusBadgeProps {
  status: ProjectStatus;
  isArchived?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  COMPLETED: {
    label: 'COMPLETED',
    bgClass: 'bg-sage',
    textClass: 'text-text',
  },
  PENDING_REVIEW: {
    label: 'PENDING_REVIEW',
    bgClass: 'bg-lavender',
    textClass: 'text-text',
  },
  IN_PROGRESS: {
    label: 'IN_PROGRESS',
    bgClass: 'bg-blue',
    textClass: 'text-text',
  },
  CHANGES_REQUESTED: {
    label: 'CHANGES_REQUESTED',
    bgClass: 'bg-peach',
    textClass: 'text-text',
  },
  REJECTED: {
    label: 'REJECTED',
    bgClass: 'bg-error/20',
    textClass: 'text-error',
  },
  DRAFT: {
    label: 'DRAFT',
    bgClass: 'bg-divider',
    textClass: 'text-text-muted',
  },
};

export function StatusBadge({ status, isArchived, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        data-testid={`badge-${status}`}
        className={`font-sans text-xs px-2.5 py-0.5 rounded-full font-medium tracking-wide ${config.bgClass} ${config.textClass}`}
      >
        {config.label}
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
