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
      <div className="bg-surface border border-border rounded-lg p-8 text-center text-sm font-sans text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
      {/* Horizontal scrolling wrapper strictly isolated to the table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-sans divide-y divide-divider min-w-[700px]">
          <thead className="bg-sidebar/60 text-xs font-sans text-text-muted uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-3 px-4 sm:px-5 font-semibold">
                Title
              </th>
              {showLead && (
                <th scope="col" className="py-3 px-4 font-semibold">
                  Lead Student
                </th>
              )}
              {showGuide && (
                <th scope="col" className="py-3 px-4 font-semibold">
                  Faculty Guide
                </th>
              )}
              <th scope="col" className="py-3 px-4 font-semibold">
                Status
              </th>
              <th scope="col" className="py-3 px-4 font-semibold w-36">
                Progress
              </th>
              <th scope="col" className="py-3 px-4 font-semibold text-center w-20">
                Team
              </th>
              <th scope="col" className="py-3 px-4 font-semibold">
                Updated
              </th>
              <th scope="col" className="py-3 px-4 sm:px-5 font-semibold text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider bg-surface">
            {projects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-sidebar/40 transition-colors duration-150 group"
              >
                <td className="py-3.5 px-4 sm:px-5 font-medium text-text max-w-xs">
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:text-primary transition-colors block line-clamp-1 font-serif text-base"
                    title={project.title}
                  >
                    {project.title}
                  </Link>
                  {project.description && (
                    <span className="text-xs text-text-muted line-clamp-1 font-sans">
                      {project.description}
                    </span>
                  )}
                </td>
                {showLead && (
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                    {project.createdBy.fullName}
                  </td>
                )}
                {showGuide && (
                  <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                    {project.guide.fullName}
                  </td>
                )}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge
                    status={project.status}
                    isArchived={isArchivedView || !!project.archivedAt}
                  />
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <ProgressBar progress={project.progress} size="sm" />
                </td>
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    <span>{project.memberCount}/3</span>
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs text-text-muted whitespace-nowrap">
                  {formatDateTime(project.updatedAt)}
                </td>
                <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
