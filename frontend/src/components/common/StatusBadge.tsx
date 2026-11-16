import { ProjectStatus } from '../../types/api';
import { formatStatusLabel } from '../../lib/status';

interface StatusBadgeProps {
  status: ProjectStatus;
  isArchived?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ProjectStatus,
  { bgClass: string; textClass: string; borderClass: string }
> = {
  COMPLETED: {
    bgClass: 'bg-sage bg-lime',
    textClass: 'text-ink',
    borderClass: 'border-2 border-ink',
  },
  PENDING_REVIEW: {
    bgClass: 'bg-lavender bg-violet-tint',
    textClass: 'text-ink',
    borderClass: 'border-2 border-ink',
  },
  IN_PROGRESS: {
    bgClass: 'bg-blue bg-sky-tint',
    textClass: 'text-ink',
    borderClass: 'border-2 border-ink',
  },
  CHANGES_REQUESTED: {
    bgClass: 'bg-peach bg-marigold-tint',
    textClass: 'text-ink',
    borderClass: 'border-2 border-ink',
  },
  REJECTED: {
    bgClass: 'bg-error/20 bg-coral',
    textClass: 'text-ink',
    borderClass: 'border-2 border-ink',
  },
  DRAFT: {
    bgClass: 'bg-divider bg-paper-dark',
    textClass: 'text-ink',
    borderClass: 'border-2 border-dashed border-ink',
  },
};

export function StatusBadge({ status, isArchived, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const label = formatStatusLabel(status);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        data-testid={`badge-${status}`}
        className={`font-mono text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold ${config.bgClass} ${config.textClass} ${config.borderClass}`}
      >
        {label}
      </span>
      {isArchived && (
        <span
          data-testid="badge-archived"
          className="font-mono text-xs uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border-2 border-dashed border-ink text-ink bg-white"
        >
          Archived
        </span>
      )}
    </div>
  );
}
