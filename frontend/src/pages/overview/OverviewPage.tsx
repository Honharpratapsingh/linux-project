import { Link } from 'react-router-dom';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ArrowRight,
  FolderKanban,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useApi } from '../../lib/useApi';
import { api } from '../../lib/api';
import {
  DashboardSummary,
  DashboardSummaryStudent,
  DashboardSummaryFaculty,
  ProjectStatus,
} from '../../types/api';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate, formatDateTime } from '../../lib/dates';

function StatusCountStrip({
  counts,
}: {
  counts: Record<ProjectStatus, number>;
}) {
  const statuses: {
    key: ProjectStatus;
    label: string;
    tileBg: string;
    border: string;
  }[] = [
    { key: 'DRAFT', label: 'Draft', tileBg: 'bg-paper-dark', border: 'border-2 border-dashed border-ink' },
    { key: 'PENDING_REVIEW', label: 'Pending Review', tileBg: 'bg-violet-tint', border: 'border-2 border-ink' },
    { key: 'CHANGES_REQUESTED', label: 'Changes Requested', tileBg: 'bg-marigold-tint', border: 'border-2 border-ink' },
    { key: 'IN_PROGRESS', label: 'In Progress', tileBg: 'bg-sky-tint', border: 'border-2 border-ink' },
    { key: 'COMPLETED', label: 'Completed', tileBg: 'bg-lime', border: 'border-2 border-ink' },
    { key: 'REJECTED', label: 'Rejected', tileBg: 'bg-coral', border: 'border-2 border-ink' },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 text-center">
        {statuses.map(({ key, label, tileBg, border }) => (
          <div
            key={key}
            className={`p-3 sm:p-4 rounded-[12px] ${tileBg} ${border} shadow-[4px_4px_0_0_#1B1410] flex flex-col items-center justify-between transition-transform duration-120 hover:-translate-y-0.5`}
          >
            <span className="text-xs text-ink font-mono font-bold uppercase tracking-wider line-clamp-1">
              {label}
            </span>
            <span className="text-4xl sm:text-5xl lg:text-[56px] font-display font-serif font-black text-ink tabular-nums my-1 leading-none">
              {counts[key] || 0}
            </span>
            <span className="text-[10px] font-mono text-ink/70 uppercase tracking-widest font-semibold">
              PROJECTS
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentOverview({ data }: { data: DashboardSummaryStudent }) {
  const hasAnyProjects =
    data.activeProject !== null ||
    Object.values(data.countsByStatus).some((c) => c > 0);

  if (!hasAnyProjects) {
    return (
      <EmptyState
        title="No Projects Yet"
        description="You have not created or joined any capstone projects. Get started by proposing your project and choosing a faculty guide."
        action={
          <Link to="/projects/new">
            <Button
              variant="primary"
              size="md"
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Create Project
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Active Project */}
      {data.activeProject && (
        <section aria-labelledby="active-project-heading">
          <div className="card-hard-static bg-white overflow-hidden">
            {/* Marigold header band */}
            <div className="h-4 w-full bg-marigold border-b-2 border-ink" />

            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm bg-marigold text-ink">
                  ACTIVE PROJECT
                </span>
                <StatusBadge status={data.activeProject.status} />
              </div>

              <h2
                id="active-project-heading"
                className="font-display font-black text-2xl sm:text-3xl text-ink mb-2 line-clamp-2 tracking-tight"
              >
                <Link
                  to={`/projects/${data.activeProject.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {data.activeProject.title}
                </Link>
              </h2>

              <p className="font-sans text-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                {data.activeProject.description || 'No description provided.'}
              </p>

              <div className="mb-4">
                <ProgressBar progress={data.activeProject.progress} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t-2 border-ink text-xs text-text-secondary">
                <div className="flex items-center gap-4 font-mono">
                  <span>
                    GUIDE:{' '}
                    <strong className="text-ink font-bold font-sans">
                      {data.activeProject.guide.fullName}
                    </strong>
                  </span>
                  <span>
                    TEAM:{' '}
                    <strong className="text-ink font-bold">
                      {data.activeProject.memberCount}/3
                    </strong>
                  </span>
                  <span>
                    MILESTONES:{' '}
                    <strong className="text-ink font-bold">
                      {data.activeProject.milestoneCompleted}/
                      {data.activeProject.milestoneTotal}
                    </strong>
                  </span>
                </div>
                <Link
                  to={`/projects/${data.activeProject.id}`}
                  className="text-primary font-bold flex items-center gap-1 hover:underline font-mono uppercase tracking-wider text-xs"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Upcoming Milestones */}
      <section aria-labelledby="milestones-heading">
        <div className="card-hard-static bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-2 bg-teal text-white">
                UPCOMING MILESTONES
              </span>
              <h3
                id="milestones-heading"
                className="font-display font-bold text-xl text-ink flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-text-muted" /> Upcoming Milestones
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-ink bg-paper-dark border-2 border-ink px-2 py-0.5 rounded-full">
              {data.upcomingMilestones.length} pending
            </span>
          </div>

          {data.upcomingMilestones.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-3 text-center">
              No upcoming incomplete milestones with due dates.
            </p>
          ) : (
            <ul className="divide-y-2 divide-ink">
              {data.upcomingMilestones.map((m) => (
                <li
                  key={m.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                >
                  <div>
                    <span className="font-sans text-sm font-bold text-ink block">
                      {m.title}
                    </span>
                    <Link
                      to={`/projects/${m.projectId}`}
                      className="text-xs text-text-muted hover:text-primary transition-colors font-mono"
                    >
                      {m.projectTitle}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary shrink-0 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    <span>Due {formatDate(m.dueDate)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3. Recent Faculty Feedback */}
      <section aria-labelledby="feedback-heading">
        <div className="card-hard-static bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-2 bg-sky-tint text-ink">
                FACULTY FEEDBACK
              </span>
              <h3
                id="feedback-heading"
                className="font-display font-bold text-xl text-ink flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-text-muted" /> Recent Faculty Feedback
              </h3>
            </div>
            <span className="font-mono text-xs font-bold text-ink bg-paper-dark border-2 border-ink px-2 py-0.5 rounded-full">
              {data.recentFeedback.length} notes
            </span>
          </div>

          {data.recentFeedback.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-3 text-center">
              No faculty feedback received yet.
            </p>
          ) : (
            <ul className="divide-y-2 divide-ink">
              {data.recentFeedback.map((fb, idx) => (
                <li key={idx} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">
                        {fb.author.fullName}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-paper-dark border border-ink text-ink">
                        {fb.feedbackType.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-text-muted shrink-0">
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-sans text-text-secondary italic leading-relaxed">
                    &ldquo;{fb.message}&rdquo;
                  </p>
                  <Link
                    to={`/projects/${fb.projectId}`}
                    className="text-xs font-mono text-primary font-bold hover:underline inline-block mt-0.5 uppercase tracking-wider"
                  >
                    {fb.projectTitle} &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. Status summary strip */}
      <section aria-label="Status counts">
        <StatusCountStrip counts={data.countsByStatus} />
      </section>
    </div>
  );
}

function FacultyOverview({ data }: { data: DashboardSummaryFaculty }) {
  return (
    <div className="space-y-6">
      {/* 1. Status count strip */}
      <StatusCountStrip counts={data.countsByStatus} />

      {/* 2. Pending Reviews Table */}
      <section aria-labelledby="pending-reviews-heading">
        <div className="card-hard-static bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-2 bg-violet-tint text-ink">
                PENDING REVIEW QUEUE
              </span>
              <h3
                id="pending-reviews-heading"
                className="font-display font-bold text-xl text-ink flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-text-muted" /> Projects Pending Review
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-sans">
                Assigned projects awaiting your review ({data.pendingReviewsForMe} total)
              </p>
            </div>
            <Link
              to="/pending-reviews"
              className="text-xs text-primary font-mono font-bold hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {data.pendingReviewItems.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-6 text-center">
              No projects pending your review right now.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-left text-sm font-sans border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink text-xs font-mono uppercase tracking-wider text-ink bg-paper-dark">
                    <th className="py-2.5 px-3 font-bold">Project Title</th>
                    <th className="py-2.5 px-3 font-bold">Lead Student</th>
                    <th className="py-2.5 px-3 font-bold">Submitted</th>
                    <th className="py-2.5 px-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-ink">
                  {data.pendingReviewItems.map((p) => (
                    <tr key={p.id} className="even:bg-paper odd:bg-white hover:bg-marigold/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-ink max-w-xs truncate font-display">
                        <Link
                          to={`/projects/${p.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-text-secondary font-medium">
                        {p.createdBy.fullName}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-text-muted whitespace-nowrap">
                        {formatDateTime(p.submissionDate)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link to={`/projects/${p.id}`}>
                          <Button variant="outline" size="sm">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 3. Ready to Complete Projects */}
      <section aria-labelledby="ready-complete-heading">
        <div className="card-hard-static bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-ink shadow-[2px_2px_0_0_#1B1410] rounded-sm mb-2 bg-lime text-ink">
                READY FOR SIGN-OFF
              </span>
              <h3
                id="ready-complete-heading"
                className="font-display font-bold text-xl text-ink flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-primary" /> Ready for Final Sign-off
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 font-sans">
                Active projects where all milestones have been completed ({data.readyToComplete.length})
              </p>
            </div>
          </div>

          {data.readyToComplete.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-6 text-center">
              No projects currently ready for final completion sign-off.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.readyToComplete.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-[12px] bg-paper border-2 border-ink shadow-[3px_3px_0_0_#1B1410] flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-display text-base font-bold text-ink mb-1 truncate">
                      <Link
                        to={`/projects/${p.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {p.title}
                      </Link>
                    </h4>
                    <p className="text-xs text-text-secondary mb-3 font-mono">
                      Lead: <span className="text-ink font-bold font-sans">{p.createdBy.fullName}</span> &bull; {p.milestoneCompleted}/{p.milestoneTotal} milestones complete
                    </p>
                    <ProgressBar progress={100} size="sm" />
                  </div>
                  <div className="mt-4 pt-3 border-t-2 border-ink flex justify-end">
                    <Link to={`/projects/${p.id}`}>
                      <Button variant="primary" size="sm">
                        Complete Capstone
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick link actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link to="/projects">
          <Button variant="outline" size="md" icon={<FolderKanban className="w-4 h-4" />}>
            All Projects Directory
          </Button>
        </Link>
        <Link to="/pending-reviews">
          <Button variant="primary" size="md" icon={<Clock className="w-4 h-4" />}>
            Review Queue
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi<DashboardSummary>(
    () => api.get<DashboardSummary>('/dashboard/summary'),
    []
  );

  return (
    <div>
      <PageHeader
        title={user?.role === 'FACULTY' ? 'Faculty Overview' : 'Student Overview'}
        description={
          user?.role === 'FACULTY'
            ? 'Monitor capstone progress, review submissions, and manage completion sign-offs.'
            : 'Track your capstone project, upcoming milestones, and faculty reviews.'
        }
        actions={
          user?.role === 'STUDENT' ? (
            <Link to="/projects/new">
              <Button
                variant="primary"
                size="md"
                icon={<PlusCircle className="w-4 h-4" />}
              >
                Create Project
              </Button>
            </Link>
          ) : (
            <Link to="/projects">
              <Button
                variant="outline"
                size="md"
                icon={<FileText className="w-4 h-4" />}
              >
                All Projects
              </Button>
            </Link>
          )
        }
      />

      {loading && <LoadingState message="Loading dashboard summary..." />}

      {error && (
        <ErrorState
          title="Could not load overview"
          message={error.message}
          onRetry={refetch}
        />
      )}

      {data && data.role === 'STUDENT' && <StudentOverview data={data} />}
      {data && data.role === 'FACULTY' && <FacultyOverview data={data} />}
    </div>
  );
}
