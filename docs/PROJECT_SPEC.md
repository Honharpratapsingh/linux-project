# ProjectHub — Project Specification

**Course:** 21CSE216P — Linux and Container Technologies  
**Institution:** SRM Institute of Science and Technology  
**Capstone Project:** Containerized Student Project Tracking and Management System  
**Document Version:** 1.0 (Phase 1)

---

## 1. Overview

ProjectHub is a web application that enables SRM students to create, manage, and track capstone projects with faculty guidance. Students form teams, assign a faculty guide, define milestones, and submit projects for faculty review. Faculty review submissions, provide feedback, request changes, and approve or reject projects.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18, Vite, TypeScript | Served by Nginx in production |
| Styling | Tailwind CSS v3 | Custom design tokens in tailwind.config.js |
| Routing | React Router v6 | Client-side routing |
| Forms | React Hook Form + Zod | Validation at form and API boundary |
| Icons | Lucide React | |
| Backend | Node.js LTS, Express, TypeScript | REST API under /api |
| Validation | Zod | Shared schema definitions |
| Auth | bcrypt + express-session + connect-pg-simple | Sessions stored in PostgreSQL |
| Rate Limiting | express-rate-limit | Applied per-route |
| Database | PostgreSQL 16 | Raw `pg` with parameterized SQL only |
| Migrations | Plain SQL files + custom ts-node runner | In db/migrations/, run in filename order |
| Tests | Vitest, supertest, React Testing Library | Playwright added in Phase 4 |
| Containers | Podman only | Fully qualified image names required |

---

## 3. Roles

Exactly two roles:

| Role | Description | Registration |
|------|-------------|-------------|
| **STUDENT** | Creates projects, builds teams, tracks milestones, submits for review | Self-registers via /api/auth/register |
| **FACULTY** | Reviews projects, approves, rejects, requests changes, provides feedback, marks complete | Provisioned via admin script (Phase 3) |

No other roles exist. There is no admin role in the application UI.

---

## 4. Project Workflow

### 4.1 Status Values

Exactly six statuses (enforced as a PostgreSQL enum `project_status`):

| Status | Description |
|--------|-------------|
| `DRAFT` | Initial state; student is building the project |
| `PENDING_REVIEW` | Student submitted; awaiting faculty review |
| `CHANGES_REQUESTED` | Faculty reviewed and requested changes |
| `REJECTED` | Faculty rejected the project (terminal) |
| `IN_PROGRESS` | Faculty approved; active execution phase |
| `COMPLETED` | Project successfully completed (terminal) |

### 4.2 Status Transitions

```
DRAFT → PENDING_REVIEW              (student submits)
PENDING_REVIEW → IN_PROGRESS        (faculty approves)
PENDING_REVIEW → CHANGES_REQUESTED  (faculty requests changes)
PENDING_REVIEW → REJECTED           (faculty rejects — terminal)
CHANGES_REQUESTED → PENDING_REVIEW  (student resubmits)
IN_PROGRESS → COMPLETED             (faculty marks complete — terminal)
```

REJECTED and COMPLETED are terminal: no further transitions are permitted.

### 4.3 Archiving and Soft Deletion

Archiving and soft deletion are **independent of status**:
- Archived projects: `archived_at` and `archived_by` columns (non-null means archived)
- Deleted projects: `deleted_at` and `deleted_by` columns (non-null means soft-deleted)
- A COMPLETED project can be archived. A REJECTED project can be soft-deleted.
- These are NOT extra statuses.

---

## 5. Data Model

### 5.1 Tables

| Table | Description |
|-------|-------------|
| `users` | All users (STUDENT and FACULTY) |
| `projects` | Projects with status, ownership, guide assignment |
| `project_members` | Team membership (max 3 members per project) |
| `milestones` | Project milestones with due dates and status |
| `feedback` | Faculty feedback entries per project |
| `audit_log` | Immutable log of status transitions and key actions |
| `session` | connect-pg-simple session store |
| `schema_migrations` | Tracks applied migration files |

### 5.2 Key Constraints

- Team size: max 3 members per project (enforced at application layer, not DB constraint)
- Project owner is not automatically a project_member; they are separate
- Faculty guide (projects.guide_id) must have role = FACULTY (enforced at application layer)
- Enum types: `user_role`, `project_status`, `milestone_status`
- All foreign keys use UUID references
- All timestamps are TIMESTAMPTZ

---

## 6. API Design

Base path: `/api`  
All endpoints (except health and auth) require an authenticated session.

### Phase 1 Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check — returns `{"status":"ok","timestamp":"..."}` |

### Planned Endpoints (Phase 2+)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Student self-registration |
| POST | /api/auth/login | Login (all roles) |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current session user |
| GET/POST | /api/projects | List / create projects |
| GET/PATCH/DELETE | /api/projects/:id | Get / update / soft-delete project |
| POST | /api/projects/:id/submit | Submit for review |
| POST | /api/projects/:id/approve | Faculty approve |
| POST | /api/projects/:id/reject | Faculty reject |
| POST | /api/projects/:id/request-changes | Faculty request changes |
| POST | /api/projects/:id/complete | Faculty mark complete |
| GET/POST | /api/projects/:id/members | Team membership |
| GET/POST | /api/projects/:id/milestones | Milestones |
| GET/POST | /api/projects/:id/feedback | Feedback |

---

## 7. Authentication (Phase 2)

- Students self-register with email, password (bcrypt, min 12 rounds), full name, student ID.
- Faculty are provisioned server-side (no self-registration).
- Sessions use express-session stored in PostgreSQL via connect-pg-simple.
- CSRF protection via same-site cookies and custom header check.
- Rate limiting on auth endpoints.
- Passwords never returned in API responses.

---

## 8. Frontend Architecture (Phase 3)

```
src/
├── components/     # Shared UI components
│   ├── ui/         # Primitives (Button, Input, Badge, etc.)
│   └── layout/     # Navbar, Sidebar, PageWrapper
├── pages/          # Route-level page components
├── hooks/          # Custom React hooks (useAuth, useProject, etc.)
├── lib/            # API client, Zod schemas, utilities
├── types/          # TypeScript type definitions
└── test/           # Test setup
```

Design tokens (Tailwind colors):
- `primary-*`: Blue scale (SRM brand)
- `secondary-*`: Slate scale (neutrals)

---

## 9. Container Architecture (Phase 5)

```
Browser
  └── Nginx container (port 3000, host-exposed)
        ├── Serves React build (static files)
        └── Proxies /api → Express container (port 5000, internal)
                              └── PostgreSQL 16 container (port 5432, internal)
                                    └── Named volume: projecthub_pgdata
```

- All containers on one dedicated Podman network: `projecthub-net`
- Services communicate by service name, never `localhost`
- Nginx is the ONLY host-exposed service (port 3000)
- Images use fully qualified names: `docker.io/library/node:22-alpine`, `docker.io/library/postgres:16`, `docker.io/library/nginx:alpine`
- No Docker, no Kubernetes, no Redis, no cloud services

---

## 10. Development Phases

| Phase | Title | Key Deliverables |
|-------|-------|-----------------|
| 1 | Foundation & Environment Verification | Scaffolding, schema, test setup, this spec |
| 2 | Auth & Backend | Sessions, auth endpoints, all API routes, Zod schemas |
| 3 | Frontend on Real API | Full React UI connected to live backend |
| 4 | Integration & E2E | Playwright tests, full flow verification |
| 5 | Podman Containerization | Containerfiles, compose.yaml, Nginx config, registry |
| 6 | Final Verification & Delivery | End-to-end container smoke test, documentation |

---

## 11. Out of Scope (Never Implement)

- Redis, Kubernetes, microservices
- AI/ML APIs, Firebase, cloud databases
- Extra roles beyond STUDENT and FACULTY
- Extra statuses beyond the six defined
- Real-time features (WebSockets, SSE)
- File uploads in Phase 1–3
- Email notifications in Phase 1–3
