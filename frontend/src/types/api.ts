export type UserRole = 'STUDENT' | 'FACULTY';

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
  email?: string;
}

export type ProjectStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type CompletionBlockedReason = 'NO_MILESTONES' | 'INCOMPLETE_MILESTONES' | null;

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
  completionBlockedReason: CompletionBlockedReason;
}

export type MembershipRole = 'LEAD' | 'MEMBER';

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
  progress: number; // 0-100 integer
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
  dueDate: string | null; // YYYY-MM-DD
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FeedbackType = 'COMMENT' | 'APPROVAL' | 'CHANGES_REQUESTED' | 'REJECTION';

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

export interface ListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UpcomingMilestoneItem {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  dueDate: string | null;
}

export interface RecentFeedbackItem {
  projectId: string;
  projectTitle: string;
  author: UserRef;
  message: string;
  feedbackType: FeedbackType;
  createdAt: string;
}

export interface DashboardSummaryStudent {
  role: 'STUDENT';
  countsByStatus: Record<ProjectStatus, number>;
  activeProject: ProjectSummary | null;
  upcomingMilestones: UpcomingMilestoneItem[];
  recentFeedback: RecentFeedbackItem[];
}

export interface DashboardSummaryFaculty {
  role: 'FACULTY';
  countsByStatus: Record<ProjectStatus, number>;
  pendingReviewsForMe: number;
  pendingReviewItems: ProjectSummary[];
  readyToComplete: ProjectSummary[];
}

export type DashboardSummary = DashboardSummaryStudent | DashboardSummaryFaculty;

export interface DirectoryUser {
  id: string;
  fullName: string;
  email: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
