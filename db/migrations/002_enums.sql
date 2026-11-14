-- Role enum: exactly two roles
CREATE TYPE user_role AS ENUM ('STUDENT', 'FACULTY');

-- Project workflow status enum: exactly six statuses
CREATE TYPE project_status AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'CHANGES_REQUESTED',
  'REJECTED',
  'IN_PROGRESS',
  'COMPLETED'
);

-- Milestone status enum
CREATE TYPE milestone_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE'
);
