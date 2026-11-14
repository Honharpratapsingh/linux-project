export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const validationError = (message = 'Validation failed', details?: Record<string, any>) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthenticated = (message = 'Not authenticated') =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'Forbidden') =>
  new AppError(403, 'FORBIDDEN', message);

export const csrfInvalid = (message = 'Invalid or missing CSRF token') =>
  new AppError(403, 'CSRF_INVALID', message);

export const notFound = (message = 'Not found') =>
  new AppError(404, 'NOT_FOUND', message);

export const emailTaken = (message = 'Email already in use') =>
  new AppError(409, 'EMAIL_TAKEN', message);

export const teamFull = (message = 'Project team is full (max 3 members)') =>
  new AppError(409, 'TEAM_FULL', message);

export const alreadyMember = (message = 'User is already a project member') =>
  new AppError(409, 'ALREADY_MEMBER', message);

export const cannotRemoveLead = (message = 'Cannot remove the project lead') =>
  new AppError(409, 'CANNOT_REMOVE_LEAD', message);

export const invalidState = (message = 'Invalid project state transition') =>
  new AppError(409, 'INVALID_STATE', message);

export const projectArchived = (message = 'Project is archived') =>
  new AppError(409, 'PROJECT_ARCHIVED', message);

export const completionBlocked = (
  reason: 'NO_MILESTONES' | 'INCOMPLETE_MILESTONES',
  message = 'Completion blocked'
) =>
  new AppError(409, 'COMPLETION_BLOCKED', message, { completionBlockedReason: reason });

export const rateLimited = (message = 'Too many requests, please try again later') =>
  new AppError(429, 'RATE_LIMITED', message);
