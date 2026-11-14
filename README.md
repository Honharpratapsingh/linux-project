# ProjectHub

Student Project Tracking and Management System — SRM Institute of Science and Technology  
Course: 21CSE216P (Linux and Container Technologies)

## Phase 1 & 2 — Verified Environment

| Tool | Version | Status |
|------|---------|--------|
| Node.js | v22.23.2 | ✅ Available |
| npm | 10.9.8 | ✅ Available |
| git | 2.54.0 | ✅ Available |
| PostgreSQL 16 (`postgresql@16`) | 16.16 | ✅ Installed & Running locally |
| Podman | — | ❌ Not installed (Blocked) |
| Podman Compose probe | — | ❌ Blocked |
| `scripts/dev-db.sh` | — | ⚠️ Authored, execution Blocked (no Podman) |

> **Note:** Podman is not installed on this machine; container audits and Compose probes are marked as **Blocked**. Development currently uses local PostgreSQL 16 managed via Homebrew services on port 5432 with databases `projecthub_dev` and `projecthub_test`.

### Port Configuration Notice
On macOS, port 5000 is occupied by the native AirPlay Receiver service (`ControlCenter` listening on `*:5000`). For local host development, the backend development server runs on `PORT=5001`. The Vite frontend dev server proxies `/api` requests to `VITE_API_PROXY_TARGET` (defaulting to `http://127.0.0.1:5001`). The backend configuration (`backend/src/config/env.ts`) default port and all documented container runtime ports remain 5000.

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy env
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 3. Run migrations (requires a running PostgreSQL instance)
# Note: Migrations live in backend/migrations
npm run migrate

# 4. Provision initial faculty account (or run demo seed)
FACULTY_NAME="Dr. Rajesh Sharma" FACULTY_EMAIL="sharma@example.com" FACULTY_PASSWORD="faculty_password_123" npm run provision:faculty

# 5. (Optional) Seed demo data across all statuses
DEMO_SEED_PASSWORD="demo_password_123" npm run seed:demo

# 6. Start backend (runs on dev port 5001)
npm run dev:backend

# 7. Start frontend (port 5173, proxies /api to port 5001)
npm run dev:frontend
```

## Running Tests

To run the complete test suite against the local test database without hardcoded credentials in source files, pass the test database URL in the environment:

```bash
TEST_DATABASE_URL=postgresql://projecthub:projecthub@localhost:5432/projecthub_test npm test
```

## CLI Scripts

### Faculty Provisioning
Creates a `FACULTY` user with a bcrypt hashed password. Fails if environment variables are missing, the email already exists, or the password is under 8 characters:

```bash
FACULTY_NAME="Dr. Ananya Iyer" FACULTY_EMAIL="iyer@example.com" FACULTY_PASSWORD="secure_faculty_password" npm run provision:faculty
```

### Demo Seeding
Idempotent demo dataset generator. Creates 3 faculty members, 6 students, and 9 projects covering every status (including `IN_PROGRESS` with completed milestones, `COMPLETED` archived, and `DRAFT` full team). Refuses to run in production unless `ALLOW_DEMO_SEED=true`:

```bash
DEMO_SEED_PASSWORD="demo_seed_password_123" npm run seed:demo
```

## Phase 3 — Frontend (Real Backend API)

- **Stack**: React 18, Vite, TypeScript, Tailwind CSS v3 (warm editorial pastel palette), React Router v6, Lucide React, React Hook Form + Zod, Vitest + React Testing Library.
- **Design Tokens**: Warm editorial pastel palette (`#FAF8F3` background, `#FFFFFF` surface, `#F5F0E8` sidebar, `#554637` primary, `#292722` text, pastel status badges). Typography: Geist Sans (UI) & Newsreader (serif titles).
- **Architecture**:
  - `src/lib/api.ts`: Central fetch client communicating with the backend over `/api` (proxied via Vite). Handles CSRF memory caching, automatic single retry on `403 CSRF_INVALID`, automatic redirect on unhandled `401`, and error normalization into `ApiError`.
  - `src/features/auth/AuthContext.tsx` & `Guards.tsx`: Role-aware authentication context with `RequireAuth`, `RequireRole`, and `RedirectIfAuth` route guards.
  - Role-specific workflows:
    - **Student**: Student Overview, My Projects list, Create Project, Project Details (milestones management, team management up to 3 students via exact email search, submission, archive/restore).
    - **Faculty**: Faculty Overview (pending reviews count & items, ready-to-complete items, compact status strip), All Projects dense directory, Pending Reviews queue, Project Details (evaluation, approve, request revisions, reject, final complete sign-off).
    - **Shared**: Status history timeline, feedback thread, archived projects view, profile name & password update.
- **Running & Testing**:
  ```bash
  # Run frontend tests
  npm test --workspace=frontend

  # Typecheck and build frontend
  npm run typecheck --workspace=frontend
  npm run build --workspace=frontend
  ```

## API & Architecture

See [docs/API_CONTRACT.md](file:///Users/honharsingh/Documents/linux-project/docs/API_CONTRACT.md) for the verbatim API specification and [docs/PROJECT_SPEC.md](file:///Users/honharsingh/Documents/linux-project/docs/PROJECT_SPEC.md) for the project specification.

- **Stack**: Express + TypeScript, Zod, bcrypt, express-session + connect-pg-simple (`session` table), express-rate-limit, pg parameterized queries, Vitest + supertest.
- **Layers**: routes -> controllers -> services -> repositories.
- **Security**:
  - `X-Powered-By` disabled; `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` on all responses.
  - Session cookie (`projecthub.sid`): `HttpOnly`, `SameSite=Lax`, configurable `Secure` mode (`auto`, `true`, `false`).
  - CSRF: `GET /api/auth/csrf` issues session token; header `X-CSRF-Token` verified with `crypto.timingSafeEqual` on all mutation requests (`POST`, `PATCH`, `PUT`, `DELETE`). `Origin` header validated against `ALLOWED_ORIGINS`.
  - Rate Limiting: Login strict (5 failed per 15 min per IP+email), login loose (50 failed per 15 min per IP), registration (10/hr per IP), student search (30/min per user), password change (5 per 15 min per user).
  - Transactions: All state-changing project, workflow, team, milestone, and feedback operations execute inside PostgreSQL transactions using `SELECT ... FROM projects WHERE id = $1 AND deleted_at IS NULL FOR UPDATE` project row locks to guarantee concurrency safety.
