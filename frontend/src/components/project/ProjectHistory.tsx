import { History, GitCommit } from 'lucide-react';
import { HistoryEntry } from '../../types/api';
import { formatDateTime } from '../../lib/dates';
import { formatStatusLabel } from '../../lib/status';

interface ProjectHistoryProps {
  history: HistoryEntry[];
}

export function ProjectHistory({ history }: ProjectHistoryProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg font-medium text-text flex items-center gap-2">
            <History className="w-4 h-4 text-text-muted" /> Status History & Audit Log
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Immutable log of workflow status transitions
          </p>
        </div>
        <span className="text-xs text-text-muted">{history.length} events</span>
      </div>

      {history.length === 0 ? (
        <p className="text-sm font-sans text-text-muted py-6 text-center">
          No history recorded.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-divider">
          {history.map((h) => (
            <div key={h.id} className="relative">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-surface border-2 border-primary flex items-center justify-center">
                <GitCommit className="w-2.5 h-2.5 text-primary" />
              </div>
              <div className="bg-sidebar/40 border border-border/60 rounded-md p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-medium text-text">
                    {h.previousStatus ? (
                      <>
                        <span className="text-text-muted">{formatStatusLabel(h.previousStatus)}</span>
                        <span>&rarr;</span>
                        <span className="text-primary font-semibold">{formatStatusLabel(h.newStatus)}</span>
                      </>
                    ) : (
                      <span className="text-primary font-semibold">Created ({formatStatusLabel(h.newStatus)})</span>
                    )}
                  </div>
                  <span className="text-text-muted tabular-nums">
                    {formatDateTime(h.createdAt)}
                  </span>
                </div>
                <div className="text-text-secondary">
                  <span>Action by </span>
                  <strong className="text-text font-medium">{h.changedBy.fullName}</strong>
                </div>
                {h.reason && (
                  <p className="mt-1 text-text italic bg-surface/80 p-2 rounded border border-border/40">
                    &ldquo;{h.reason}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
