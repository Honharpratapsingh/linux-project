# PROJECTHUB — AUTHORITATIVE SPECIFICATION (condensed)

Course: 21CSE216P (Linux and Container Technologies), SRM Institute of Science and Technology.
Capstone Project: Containerized Student Project Tracking and Management System.

Stack:
- Frontend: React 18, Vite, TypeScript, Tailwind CSS (warm editorial pastel palette, self-hosted Geist Sans and Newsreader, no CDN), React Router v6, Lucide React, React Hook Form + Zod, served by Nginx in production (port 3000 host-exposed).
- Backend: Node LTS, Express, TypeScript, Zod, bcrypt, express-session + connect-pg-simple, express-rate-limit, REST under /api.
- Database: PostgreSQL 16, raw pg with parameterized SQL, plain SQL migrations in backend/migrations/.
- Tests: Vitest, supertest, React Testing Library.
- Containers: Podman only, never Docker. Fully qualified image names (docker.io/library/node:22-alpine, docker.io/library/postgres:16, docker.io/library/nginx:alpine).

Roles:
- STUDENT: Self-registers, creates projects, manages team (up to 3 members), tracks milestones, submits for review.
- FACULTY: Provisioned via admin script, reviews projects, approves, rejects, requests changes, provides feedback, marks complete.

Workflow & Lifecycle:
- Statuses (exactly six): DRAFT, PENDING_REVIEW, CHANGES_REQUESTED, REJECTED, IN_PROGRESS, COMPLETED.
- Transitions:
  DRAFT -> PENDING_REVIEW              (student submits)
  PENDING_REVIEW -> IN_PROGRESS        (faculty approves)
  PENDING_REVIEW -> CHANGES_REQUESTED  (faculty requests changes)
  PENDING_REVIEW -> REJECTED           (faculty rejects)
  CHANGES_REQUESTED -> PENDING_REVIEW  (student resubmits)
  REJECTED -> PENDING_REVIEW           (student resubmits)
  IN_PROGRESS -> COMPLETED             (faculty marks complete)
- Archiving & Soft Deletion:
  Orthogonal to status via archived_at/archived_by and deleted_at/deleted_by. A COMPLETED or REJECTED project can be archived; soft-delete requires the project to be archived first (deleted_at requires archived_at).

Database Schema:
- users: id (UUID PK), full_name, email, password_hash, role CHECK IN ('STUDENT','FACULTY'), registration_number NULL, created_at, updated_at; UNIQUE INDEX on lower(email).
- projects: id (UUID PK), title, description, created_by (FK users), guide_id (FK users NOT NULL), status CHECK IN ('DRAFT','PENDING_REVIEW','CHANGES_REQUESTED','REJECTED','IN_PROGRESS','COMPLETED') DEFAULT 'DRAFT', submission_date NULL, completed_at NULL, archived_at NULL, archived_by (FK users) NULL, deleted_at NULL, deleted_by (FK users) NULL, created_at, updated_at. CHECKs: (deleted_at IS NULL OR archived_at IS NOT NULL); (archived_at IS NULL)=(archived_by IS NULL); (deleted_at IS NULL)=(deleted_by IS NULL); (status='COMPLETED')=(completed_at IS NOT NULL).
- project_members: id (UUID PK), project_id (FK projects ON DELETE CASCADE), student_id (FK users), membership_role CHECK IN ('LEAD','MEMBER'), joined_at; UNIQUE(project_id, student_id); partial UNIQUE INDEX on (project_id) WHERE membership_role='LEAD'. Max 3 members per project.
- milestones: id (UUID PK), project_id (FK projects ON DELETE CASCADE), title, description NULL, due_date date NULL, is_completed bool DEFAULT false, completed_at NULL, created_at, updated_at; CHECK is_completed = (completed_at IS NOT NULL).
- project_feedback: id (UUID PK), project_id (FK projects ON DELETE CASCADE), faculty_id (FK users), message NOT NULL, feedback_type CHECK IN ('COMMENT','APPROVAL','CHANGES_REQUESTED','REJECTION'), created_at.
- project_status_history: id (UUID PK), project_id (FK projects ON DELETE CASCADE), previous_status NULL, new_status, changed_by (FK users), reason NULL, created_at; status CHECKs.
- session: connect-pg-simple schema (sid varchar PK, sess json NOT NULL, expire timestamp(6) NOT NULL, index on expire).
- Triggers: set_updated_at() trigger on users, projects, milestones.
- Indexes: projects(status), projects(guide_id), projects(created_by), partial index on projects WHERE deleted_at IS NULL; project_members(student_id); milestones(project_id); project_feedback(project_id, created_at); project_status_history(project_id, created_at).

Rules: Raw pg queries with parameterization only (no ORMs). No enums in PostgreSQL (use text with CHECK constraints). Foreign keys to users ON DELETE RESTRICT; cascade only on child project entities. Passwords hashed with bcrypt (min 12 rounds). Session stored in PostgreSQL via connect-pg-simple. All timestamps TIMESTAMPTZ. No soft-delete on users or milestones. Projects deleted_at requires archived_at. Exactly one LEAD per project. Max 3 members per project. Podman only for containers with fully qualified image names. No Docker, no Redis, no Kubernetes, no microservices, no cloud databases, no AI APIs.
