interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({
  progress,
  showLabel = true,
  size = 'md',
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex-1 bg-divider rounded-full overflow-hidden ${heightClass}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Project progress: ${clamped}%`}
      >
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-sans text-xs font-medium text-text-secondary w-9 text-right tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
