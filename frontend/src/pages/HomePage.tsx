export default function HomePage() {
  const statuses = [
    { label: 'COMPLETED', className: 'bg-sage text-text' },
    { label: 'PENDING_REVIEW', className: 'bg-lavender text-text' },
    { label: 'IN_PROGRESS', className: 'bg-blue text-text' },
    { label: 'CHANGES_REQUESTED', className: 'bg-peach text-text' },
    { label: 'REJECTED', className: 'bg-error/20 text-error' },
    { label: 'DRAFT', className: 'bg-divider text-text-muted' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-surface border border-border rounded-xl shadow-sm p-8 max-w-lg w-full text-center">
        <h1 className="font-serif text-3xl font-semibold text-text mb-2">
          ProjectHub
        </h1>
        <p className="font-sans text-text-secondary text-base mb-6">
          Student Project Tracking and Management System
        </p>

        <div className="mb-6">
          <h2 className="font-sans text-xs font-semibold text-text-muted tracking-wider uppercase mb-3">
            Workflow Status Badges
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {statuses.map((status) => (
              <span
                key={status.label}
                data-testid={`badge-${status.label}`}
                className={`font-sans text-xs px-2.5 py-1 rounded-full font-medium ${status.className}`}
              >
                {status.label}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-divider flex justify-center">
          <button
            type="button"
            className="font-sans bg-primary hover:bg-primary-hover text-surface px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
