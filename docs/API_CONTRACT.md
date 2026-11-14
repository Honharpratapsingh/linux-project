CONVENTIONS
- All routes are under /api. JSON only. Cookie session (name `projecthub.sid`, HttpOnly, SameSite=Lax, Secure per config). Every response carries `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. JSON body limit 100kb.
- CSRF: client calls GET /api/auth/csrf and sends the returned token in header `X-CSRF-Token` on every POST/PATCH/PUT/DELETE (including login and register). If an Origin header is present it must match ALLOWED_ORIGINS or the request gets 403 CSRF_INVALID.
- Errors: `{ "error": { "code": string, "message": string, "details"?: object } }`. Codes and statuses: VALIDATION_ERROR 400, UNAUTHENTICATED 401, FORBIDDEN 403, CSRF_INVALID 403, NOT_FOUND 404, CONFLICT 409 (EMAIL_TAKEN, TEAM_FULL, ALREADY_MEMBER, CANNOT_REMOVE_LEAD), INVALID_STATE 409, PROJECT_ARCHIVED 409, COMPLETION_BLOCKED 409, RATE_LIMITED 429, INTERNAL 500. Zod and pg errors are mapped; no stack traces or SQL in responses. Unknown JSON keys are rejected (strict schemas). Path ids must be valid UUIDs (else 400 VALIDATION_ERROR).
- Pagination: `?page=1&pageSize=20` (pageSize max 100). Lists return `{ items, page, pageSize, total }`. `sort` in updatedAt|createdAt|title|status, `order` asc|desc, default updatedAt desc; always tie-break by id.
- Timestamps are ISO-8601 strings.

SHAPES
User = { id, fullName, email, role: "STUDENT"|"FACULTY", registrationNumber: string|null, createdAt }
UserRef = { id, fullName }
ProjectSummary = { id, title, description, status, guide: UserRef, createdBy: UserRef, memberCount, milestoneTotal, milestoneCompleted, progress (0-100 integer), submissionDate|null, completedAt|null, archivedAt|null, createdAt, updatedAt }
Permissions = { canEdit, canChangeGuide, canManageTeam, canSubmit, canManageMilestones, canApprove, canReject, canRequestChanges, canComplete, canGiveFeedback, canArchive, canRestore, canDelete: booleans; completionBlockedReason: "NO_MILESTONES"|"INCOMPLETE_MILESTONES"|null }
Member = { studentId, fullName, email, registrationNumber|null, membershipRole: "LEAD"|"MEMBER", joinedAt }
ProjectDetail = ProjectSummary + { members: Member[], permissions: Permissions }
Milestone = { id, projectId, title, description|null, dueDate (YYYY-MM-DD)|null, isCompleted, completedAt|null, createdAt, updatedAt }
Feedback = { id, projectId, author: UserRef, message, feedbackType: "COMMENT"|"APPROVAL"|"CHANGES_REQUESTED"|"REJECTION", createdAt }
HistoryEntry = { id, previousStatus|null, newStatus, changedBy: UserRef, reason|null, createdAt }

ENDPOINTS
AUTH
- GET /api/auth/csrf -> 200 { csrfToken } (creates an anonymous session holding the token).
- POST /api/auth/register { fullName (2-100), email, password (8-72 chars), registrationNumber? (1-30) } -> 201 { user, csrfToken }. Always creates a STUDENT; any role field is rejected. Email trimmed and lowercased. Duplicate (case-insensitive) -> 409 EMAIL_TAKEN. Logs the user in (session regenerated).
- POST /api/auth/login { email, password } -> 200 { user, csrfToken }. Session regenerated on login. Wrong email or password -> 401 UNAUTHENTICATED with the same message for both (run a dummy bcrypt compare when the email is unknown).
- POST /api/auth/logout -> 204 (session destroyed, cookie cleared).
- GET /api/auth/me -> 200 { user } or 401.
PROFILE
- PATCH /api/profile { fullName } -> 200 { user }. Email and role can never be changed (unknown keys rejected).
- POST /api/profile/password { currentPassword, newPassword } -> 204. Verifies the current password, rehashes, regenerates the current session, and deletes the user's other sessions (`DELETE FROM session WHERE sess->>'userId' = $1 AND sid <> $2`). Rate limited.
DIRECTORY
- GET /api/faculty (any authenticated user) -> 200 { items: [{ id, fullName, email }] } sorted by name.
- GET /api/students/search?email= (STUDENT only; rate limited 30/min per user) -> 200 { items: [{ id, fullName, email }] }: exact case-insensitive email match on STUDENT users only, excluding the caller; at most 1 item.
PROJECTS
- GET /api/projects: query status, guide (partial case-insensitive match on the guide's fullName), search (partial case-insensitive title match; escape % and _), archived (true|false, default false: false hides archived, true shows only archived), assigned=me (FACULTY only: guide_id = me), page, pageSize, sort, order. Students only see projects they are a member of; faculty see all non-deleted projects (drafts included). -> 200 { items: ProjectSummary[], page, pageSize, total }.
- POST /api/projects { title (3-120), description (0-5000), guideId } (STUDENT only) -> 201 ProjectDetail. guideId must be a FACULTY user. Creates DRAFT, adds the creator as LEAD, writes history (null -> DRAFT), all in one transaction.
- GET /api/projects/:id -> 200 ProjectDetail.
- PATCH /api/projects/:id { title?, description?, guideId? } (at least one field; requires canEdit, guide change requires canChangeGuide) -> 200 ProjectDetail.
- DELETE /api/projects/:id -> 204. Soft delete; requires canDelete; a non-archived project -> 409 INVALID_STATE; sets deleted_at and deleted_by.
- GET /api/projects/:id/history -> 200 { items: HistoryEntry[] } oldest first.
WORKFLOW (all return 200 ProjectDetail)
- POST /api/projects/:id/submit (no body)
- POST /api/projects/:id/approve { message? (<=2000) }
- POST /api/projects/:id/request-changes { message (1-2000) }
- POST /api/projects/:id/reject { message (1-2000) }
- POST /api/projects/:id/complete { message? (<=2000) } stored as the history reason
- PATCH /api/projects/:id/archive (no body) and PATCH /api/projects/:id/restore (no body)
TEAM
- POST /api/projects/:id/members { studentId } -> 201 ProjectDetail. Requires canManageTeam; the target must be an existing STUDENT user; max 3 members including the creator (409 TEAM_FULL, enforced under the project row lock); duplicate -> 409 ALREADY_MEMBER.
- DELETE /api/projects/:id/members/:studentId -> 200 ProjectDetail. Requires canManageTeam; removing the LEAD -> 409 CANNOT_REMOVE_LEAD.
MILESTONES (requires canManageMilestones for writes; reads for anyone who can view the project)
- GET /api/projects/:id/milestones -> 200 { items: Milestone[] } ordered by dueDate nulls last, then createdAt.
- POST /api/projects/:id/milestones { title (1-120), description? (<=2000), dueDate? (YYYY-MM-DD) } -> 201 Milestone.
- PATCH /api/projects/:id/milestones/:milestoneId { title?, description?, dueDate?, isCompleted? } -> 200 Milestone (isCompleted true sets completedAt = now(), false clears it). A milestone from another project -> 404.
- DELETE /api/projects/:id/milestones/:milestoneId -> 204.
FEEDBACK
- GET /api/projects/:id/feedback -> 200 { items: Feedback[] } newest first (anyone who can view the project).
- POST /api/projects/:id/feedback { message (1-2000) } -> 201 Feedback of type COMMENT (requires canGiveFeedback).
DASHBOARD
- GET /api/dashboard/summary ->
  STUDENT: { role: "STUDENT", countsByStatus: { DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, REJECTED, IN_PROGRESS, COMPLETED: number } (their non-archived projects), activeProject: ProjectSummary|null (most recently updated IN_PROGRESS project, else most recently updated non-archived), upcomingMilestones: [{ id, projectId, projectTitle, title, dueDate }] (next 5 incomplete milestones with a due date across projects where milestones are manageable), recentFeedback: [{ projectId, projectTitle, author: UserRef, message, feedbackType, createdAt }] (latest 5 across their projects) }
  FACULTY: { role: "FACULTY", countsByStatus (all non-archived, non-deleted projects), pendingReviewsForMe: number, pendingReviewItems: ProjectSummary[] (up to 5, assigned to me, oldest submission first), readyToComplete: ProjectSummary[] (up to 5 IN_PROGRESS projects assigned to me with at least 1 milestone and all completed) }
HEALTH
- GET /api/health -> 200 { status: "ok", db: "up" } or 503 { status: "error", db: "down" } (unchanged).
