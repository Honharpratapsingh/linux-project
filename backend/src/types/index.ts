import { AppConfig } from '../config/env';

export type UserRole = 'STUDENT' | 'FACULTY';

export type ProjectStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type FeedbackType = 'COMMENT' | 'APPROVAL' | 'CHANGES_REQUESTED' | 'REJECTION';

export type MembershipRole = 'LEAD' | 'MEMBER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  registrationNumber: string | null;
  createdAt: string;
}

export interface UserRef {
  id: string;
  fullName: string;
}

export interface Permissions {
  canEdit: boolean;
  canChangeGuide: boolean;
  canManageTeam: boolean;
  canSubmit: boolean;
  canManageMilestones: boolean;
  canApprove: boolean;
  canReject: boolean;
  canRequestChanges: boolean;
  canComplete: boolean;
  canGiveFeedback: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDelete: boolean;
  completionBlockedReason: 'NO_MILESTONES' | 'INCOMPLETE_MILESTONES' | null;
}

export interface Member {
  studentId: string;
  fullName: string;
  email: string;
  registrationNumber: string | null;
  membershipRole: MembershipRole;
  joinedAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  guide: UserRef;
  createdBy: UserRef;
  memberCount: number;
  milestoneTotal: number;
  milestoneCompleted: number;
  progress: number;
  submissionDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  members: Member[];
  permissions: Permissions;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  projectId: string;
  author: UserRef;
  message: string;
  feedbackType: FeedbackType;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  previousStatus: ProjectStatus | null;
  newStatus: ProjectStatus;
  changedBy: UserRef;
  reason: string | null;
  createdAt: string;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    csrfToken?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      appConfig: AppConfig;
    }
  }
}
