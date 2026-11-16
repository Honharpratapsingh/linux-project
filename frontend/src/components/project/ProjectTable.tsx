import { Link } from 'react-router-dom';
import { ProjectSummary } from '../../types/api';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { formatDateTime } from '../../lib/dates';
import { ArrowRight, Users } from 'lucide-react';

interface ProjectTableProps {
  projects: ProjectSummary[];
  showGuide?: boolean;
  showLead?: boolean;
  isArchivedView?: boolean;
  emptyMessage?: string;
}

export function ProjectTable({
  projects,
  showGuide = true,
  showLead = true,
  isArchivedView = false,
  emptyMessage = 'No projects found.',
}: ProjectTableProps) {
  if (projects.length === 0) {
    return (
      <div className="card-hard-static bg-white p-8 text-center text-sm font-sans text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card-hard-static bg-white overflow-hidden">
      {/* Horizontal scrolling wrapper strictly isolated to the table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-sans min-w-[700px] border-collapse">
          <thead className="bg-ink text-paper text-xs font-mono uppercase tracking-wider border-b-2 border-ink">
            <tr>
              <th scope="col" className="py-3.5 px-4 sm:px-5 font-bold">
                Title
              </th>
              {showLead && (
                <th scope="col" className="py-3.5 px-4 font-bold">
                  Lead Student
                </th>
              )}
              {showGuide && (
                <th scope="col" className="py-3.5 px-4 font-bold">
                  Faculty Guide
                </th>
              )}
              <th scope="col" className="py-3.5 px-4 font-bold">
                Status
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold w-40">
                Progress
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold text-center w-20">
                Team
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Updated
              </th>
              <th scope="col" className="py-3.5 px-4 sm:px-5 font-bold text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-ink">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="even:bg-paper odd:bg-white hover:bg-marigold/30 transition-colors duration-150 group"
              >
                <td className="py-3.5 px-4 sm:px-5 font-medium text-ink max-w-xs">
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:text-primary transition-colors block line-clamp-1 font-display text-base font-bold"
                    title={project.title}
                  >
                    {project.title}
                  </Link>
                  {project.description && (
                    <span className="text-xs text-text-muted line-clamp-1 font-sans mt-0.5">
                      {project.description}
                    </span>
                  )}
                </td>
                {showLead && (
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap font-medium">
                    {project.createdBy.fullName}
                  </td>
                )}
                {showGuide && (
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap font-medium">
                    {project.guide.fullName}
                  </td>
                )}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge
                    status={project.status}
                    isArchived={isArchivedView || !!project.archivedAt}
                  />
                </td>
                <td className="py-3.5 px-4">
                  <ProgressBar progress={project.progress} />
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold bg-paper-dark border-2 border-ink px-2 py-0.5 rounded-full shadow-[1px_1px_0_0_#1B1410]">
                    <Users className="w-3 h-3 text-ink" />
                    {project.memberCount}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs font-mono text-text-muted whitespace-nowrap">
                  {formatDateTime(project.updatedAt)}
                </td>
                <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-ink bg-white shadow-[2px_2px_0_0_#1B1410] text-ink hover:bg-marigold transition-all duration-120 group-hover:border-ink"
                    aria-label={`View project ${project.title}`}
                  >
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
