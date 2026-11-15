import { ProjectStatus } from '../types/api';

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  COMPLETED: 'Completed',
  PENDING_REVIEW: 'Pending Review',
  IN_PROGRESS: 'In Progress',
  CHANGES_REQUESTED: 'Changes Requested',
  REJECTED: 'Rejected',
  DRAFT: 'Draft',
};

export function formatStatusLabel(status: ProjectStatus | string | null | undefined): string {
  if (!status) return '';
  if (status in STATUS_LABELS) {
    return STATUS_LABELS[status as ProjectStatus];
  }
  return status;
}
