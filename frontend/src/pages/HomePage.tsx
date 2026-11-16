export default function HomePage() {
  const statuses = [
    { label: 'COMPLETED', className: 'bg-sage bg-lime border-2 border-ink text-ink' },
    { label: 'PENDING_REVIEW', className: 'bg-lavender bg-violet-tint border-2 border-ink text-ink' },
    { label: 'IN_PROGRESS', className: 'bg-blue bg-sky-tint border-2 border-ink text-ink' },
    { label: 'CHANGES_REQUESTED', className: 'bg-peach bg-marigold-tint border-2 border-ink text-ink' },
    { label: 'REJECTED', className: 'bg-error/20 bg-coral border-2 border-ink text-ink' },
    { label: 'DRAFT', className: 'bg-divider bg-paper-dark border-2 border-dashed border-ink text-ink' },
  ];

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 select-none">
      <div className="card-hard-static bg-white p-8 sm:p-10 max-w-lg w-full text-center">
        <div className="w-12 h-12 rounded-lg bg-primary text-white border-2 border-ink flex items-center justify-center font-display text-2xl font-black shadow-[3px_3px_0_0_#1B1410] mx-auto mb-4">
          P
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-ink mb-2 tracking-tight">
          ProjectHub
        </h1>
        <p className="font-sans text-text-secondary text-base mb-6 leading-relaxed">
          Student Project Tracking and Management System
        </p>

        <div className="mb-6">
          <h2 className="font-mono text-xs font-bold text-text-muted tracking-wider uppercase mb-3">
            Workflow Status Badges
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {statuses.map((status) => (
              <span
                key={status.label}
                data-testid={`badge-${status.label}`}
                className={`font-mono text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${status.className}`}
              >
                {status.label}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t-2 border-ink flex justify-center">
          <button
            type="button"
            className="btn-hard font-sans bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
