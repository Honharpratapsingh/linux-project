interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = true,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress || 0)));

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex-1 bg-paper-dark rounded-full border-2 border-ink h-4 overflow-hidden shadow-[2px_2px_0_0_#1B1410]"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Project progress: ${clamped}%`}
      >
        <div
          className="h-full rounded-full pattern-stripes-progress border-r-2 border-ink transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs font-bold text-ink w-10 text-right tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
