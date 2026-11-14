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
  const statuses: { key: ProjectStatus; label: string }[] = [
    { key: 'DRAFT', label: 'Draft' },
    { key: 'PENDING_REVIEW', label: 'Pending Review' },
    { key: 'CHANGES_REQUESTED', label: 'Changes Requested' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 mb-6 shadow-xs">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 text-center">
        {statuses.map(({ key, label }) => (
          <div
            key={key}
            className="p-2 sm:p-2.5 rounded-md bg-sidebar/70 border border-border/50 flex flex-col items-center justify-center"
          >
            <span className="text-xs text-text-muted font-sans font-medium line-clamp-1">
              {label}
            </span>
            <span className="text-lg sm:text-xl font-serif font-semibold text-text tabular-nums mt-0.5">
              {counts[key] || 0}
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
          <div className="bg-surface border border-border rounded-lg p-5 sm:p-6 shadow-xs hover:border-text-muted/40 transition-colors">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-sans font-medium text-text-muted uppercase tracking-wider">
                Active Project
              </span>
              <StatusBadge status={data.activeProject.status} />
            </div>

            <h2
              id="active-project-heading"
              className="font-serif text-xl sm:text-2xl font-semibold text-text mb-2 line-clamp-2"
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-divider text-xs text-text-secondary">
              <div className="flex items-center gap-4">
                <span>
                  Guide:{' '}
                  <strong className="text-text font-medium">
                    {data.activeProject.guide.fullName}
                  </strong>
                </span>
                <span>
                  Team:{' '}
                  <strong className="text-text font-medium">
                    {data.activeProject.memberCount}/3
                  </strong>
                </span>
                <span>
                  Milestones:{' '}
                  <strong className="text-text font-medium">
                    {data.activeProject.milestoneCompleted}/
                    {data.activeProject.milestoneTotal}
                  </strong>
                </span>
              </div>
              <Link
                to={`/projects/${data.activeProject.id}`}
                className="text-primary font-medium flex items-center gap-1 hover:underline"
              >
                View Project Details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 2. Upcoming Milestones */}
      <section aria-labelledby="milestones-heading">
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3
              id="milestones-heading"
              className="font-serif text-lg font-medium text-text flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-text-muted" /> Upcoming Milestones
            </h3>
            <span className="text-xs text-text-muted">
              {data.upcomingMilestones.length} pending
            </span>
          </div>

          {data.upcomingMilestones.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-3 text-center">
              No upcoming incomplete milestones with due dates.
            </p>
          ) : (
            <ul className="divide-y divide-divider">
              {data.upcomingMilestones.map((m) => (
                <li
                  key={m.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                >
                  <div>
                    <span className="font-sans text-sm font-medium text-text block">
                      {m.title}
                    </span>
                    <Link
                      to={`/projects/${m.projectId}`}
                      className="text-xs text-text-muted hover:text-primary transition-colors"
                    >
                      {m.projectTitle}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary shrink-0">
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
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3
              id="feedback-heading"
              className="font-serif text-lg font-medium text-text flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-text-muted" /> Recent Faculty Feedback
            </h3>
            <span className="text-xs text-text-muted">
              {data.recentFeedback.length} notes
            </span>
          </div>

          {data.recentFeedback.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-3 text-center">
              No faculty feedback received yet.
            </p>
          ) : (
            <ul className="divide-y divide-divider">
              {data.recentFeedback.map((fb, idx) => (
                <li key={idx} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text">
                        {fb.author.fullName}
                      </span>
                      <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-sidebar text-text-secondary border border-border/60">
                        {fb.feedbackType.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted shrink-0">
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-sans text-text-secondary italic leading-relaxed">
                    &ldquo;{fb.message}&rdquo;
                  </p>
                  <Link
                    to={`/projects/${fb.projectId}`}
                    className="text-xs text-primary hover:underline inline-block mt-0.5"
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
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                id="pending-reviews-heading"
                className="font-serif text-lg font-medium text-text flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-text-muted" /> Projects Pending Review
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Assigned projects awaiting your review ({data.pendingReviewsForMe} total)
              </p>
            </div>
            <Link
              to="/pending-reviews"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
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
              <table className="w-full text-left text-sm font-sans">
                <thead>
                  <tr className="border-b border-divider text-xs text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 font-medium">Project Title</th>
                    <th className="py-2.5 font-medium">Lead Student</th>
                    <th className="py-2.5 font-medium">Submitted</th>
                    <th className="py-2.5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {data.pendingReviewItems.map((p) => (
                    <tr key={p.id} className="hover:bg-sidebar/40 transition-colors">
                      <td className="py-3 pr-4 font-medium text-text max-w-xs truncate">
                        <Link
                          to={`/projects/${p.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {p.createdBy.fullName}
                      </td>
                      <td className="py-3 pr-4 text-xs text-text-muted whitespace-nowrap">
                        {formatDateTime(p.submissionDate)}
                      </td>
                      <td className="py-3 text-right">
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
        <div className="bg-surface border border-border rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3
                id="ready-complete-heading"
                className="font-serif text-lg font-medium text-text flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-primary" /> Ready for Final Sign-off
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Active projects where all milestones have been completed ({data.readyToComplete.length})
              </p>
            </div>
          </div>

          {data.readyToComplete.length === 0 ? (
            <p className="text-sm font-sans text-text-muted py-6 text-center">
              No projects currently ready for final completion sign-off.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.readyToComplete.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-lg bg-sidebar/50 border border-border/80 flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-serif text-base font-semibold text-text mb-1 truncate">
                      <Link
                        to={`/projects/${p.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {p.title}
                      </Link>
                    </h4>
                    <p className="text-xs text-text-secondary mb-3">
                      Lead: <span className="text-text font-medium">{p.createdBy.fullName}</span> &bull; {p.milestoneCompleted}/{p.milestoneTotal} milestones complete
                    </p>
                    <ProgressBar progress={100} size="sm" />
                  </div>
                  <div className="mt-4 pt-3 border-t border-divider flex justify-end">
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
