import { History, GitCommit } from 'lucide-react';
import { HistoryEntry } from '../../types/api';
import { formatDateTime } from '../../lib/dates';
import { formatStatusLabel } from '../../lib/status';

interface ProjectHistoryProps {
  history: HistoryEntry[];
}

export function ProjectHistory({ history }: ProjectHistoryProps) {
  return (
    <div className="card-hard-static bg-white p-5 sm:p-6 mb-6">
      <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-3 bg-paper-dark text-ink">
        STATUS AUDIT LOG
      </span>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-xl text-ink flex items-center gap-2">
            <History className="w-5 h-5 text-text-muted stroke-[2.5]" /> Status History & Audit Log
          </h3>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Immutable log of workflow status transitions
          </p>
        </div>
        <span className="font-mono text-xs font-bold text-ink bg-paper-dark border-2 border-ink px-2 py-0.5 rounded-full">
          {history.length} events
        </span>
      </div>

      {history.length === 0 ? (
        <p className="text-sm font-sans text-text-muted py-6 text-center">
          No history recorded.
        </p>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-1 before:bg-ink">
          {history.map((h) => (
            <div key={h.id} className="relative">
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-ink shadow-[1px_1px_0_0_#1B1410] flex items-center justify-center">
                <GitCommit className="w-3 h-3 text-ink stroke-[2.5]" />
              </div>
              <div className="bg-paper border-2 border-ink rounded-[10px] p-3.5 text-xs shadow-[2px_2px_0_0_#1B1410]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    {h.previousStatus ? (
                      <>
                        <span className="text-text-muted font-mono">{formatStatusLabel(h.previousStatus)}</span>
                        <span>&rarr;</span>
                        <span className="text-primary font-mono">{formatStatusLabel(h.newStatus)}</span>
                      </>
                    ) : (
                      <span className="text-primary font-mono">Created ({formatStatusLabel(h.newStatus)})</span>
                    )}
                  </div>
                  <span className="text-text-muted font-mono tabular-nums">
                    {formatDateTime(h.createdAt)}
                  </span>
                </div>
                <div className="text-text-secondary font-sans">
                  <span>Action by </span>
                  <strong className="text-ink font-bold">{h.changedBy.fullName}</strong>
                </div>
                {h.reason && (
                  <p className="mt-2 text-ink italic bg-white p-2.5 rounded-md border-2 border-ink">
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
