import { ProjectStatus, Permissions, UserRole } from '../types';

export interface ProjectRelation {
  isCreator: boolean;
  isMember: boolean;
  isGuide: boolean;
}

export interface MilestoneStats {
  total: number;
  completed: number;
}

export const TRANSITION_MAP = {
  submit: {
    from: ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'] as ProjectStatus[],
    to: 'PENDING_REVIEW' as ProjectStatus,
  },
  approve: {
    from: ['PENDING_REVIEW'] as ProjectStatus[],
    to: 'IN_PROGRESS' as ProjectStatus,
  },
  'request-changes': {
    from: ['PENDING_REVIEW'] as ProjectStatus[],
    to: 'CHANGES_REQUESTED' as ProjectStatus,
  },
  reject: {
    from: ['PENDING_REVIEW'] as ProjectStatus[],
    to: 'REJECTED' as ProjectStatus,
  },
  complete: {
    from: ['IN_PROGRESS'] as ProjectStatus[],
    to: 'COMPLETED' as ProjectStatus,
  },
};

export function computePermissions(
  project: {
    status: ProjectStatus;
    archivedAt: string | null;
  },
  user: { id: string; role: UserRole },
  relation: ProjectRelation,
  milestones?: MilestoneStats
): Permissions {
  const isArchived = Boolean(project.archivedAt);

  const editable =
    !isArchived &&
    relation.isCreator &&
    ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(project.status);

  const canEdit = editable;
  const canChangeGuide = editable;
  const canManageTeam = editable;
  const canSubmit = editable;

  const canManageMilestones =
    !isArchived &&
    relation.isMember &&
    ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED', 'IN_PROGRESS'].includes(project.status);

  const canApprove =
    !isArchived && relation.isGuide && project.status === 'PENDING_REVIEW';
  const canReject =
    !isArchived && relation.isGuide && project.status === 'PENDING_REVIEW';
  const canRequestChanges =
    !isArchived && relation.isGuide && project.status === 'PENDING_REVIEW';

  let completionBlockedReason: 'NO_MILESTONES' | 'INCOMPLETE_MILESTONES' | null = null;
  if (milestones) {
    if (milestones.total === 0) {
      completionBlockedReason = 'NO_MILESTONES';
    } else if (milestones.completed < milestones.total) {
      completionBlockedReason = 'INCOMPLETE_MILESTONES';
    }
  }

  const canComplete =
    !isArchived && relation.isGuide && project.status === 'IN_PROGRESS';

  const canGiveFeedback = !isArchived && relation.isGuide;

  const canArchive =
    !isArchived &&
    ((relation.isCreator && project.status === 'DRAFT') ||
      (relation.isGuide && ['COMPLETED', 'REJECTED'].includes(project.status)));

  const canRestore =
    isArchived &&
    ((relation.isCreator && project.status === 'DRAFT') ||
      (relation.isGuide && ['COMPLETED', 'REJECTED'].includes(project.status)));

  const canDelete = isArchived && relation.isGuide;

  return {
    canEdit,
    canChangeGuide,
    canManageTeam,
    canSubmit,
    canManageMilestones,
    canApprove,
    canReject,
    canRequestChanges,
    canComplete,
    canGiveFeedback,
    canArchive,
    canRestore,
    canDelete,
    completionBlockedReason,
  };
}
