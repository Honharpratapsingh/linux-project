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
| Podman | 6.2.0 (libkrun, rootless) | ✅ Installed & Verified |
| Podman Compose | 1.6.0 (external provider) | ✅ Probed & Verified |
| `scripts/dev-db.sh` | — | ✅ Authored |

> **Note:** Development PostgreSQL 16 is managed via Homebrew services on port 5432 with databases `projecthub_dev`, `projecthub_test`, and `projecthub_e2e`. Production stack runs via Podman containers on port 3000.

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

### Unit & Integration Suite
To run the complete test suite against the local test database without hardcoded credentials in source files, pass the test database URL in the environment:

```bash
TEST_DATABASE_URL=postgresql://projecthub:projecthub@localhost:5432/projecthub_test npm test
```

### Phase 4 — End-to-End (E2E) Browser Suite
The end-to-end suite uses Playwright to drive real browser interactions through complete student and faculty capstone workflows against a dedicated test database (`projecthub_e2e`). Playwright automatically spins up the backend API on port 5002 and the Vite frontend dev server on port 5175.

```bash
# Run the complete E2E test suite (auto-prepares, seeds, and runs tests)
E2E_DATABASE_URL="postgresql://projecthub:projecthub@localhost:5432/projecthub_e2e" E2E_PASSWORD="<password>" npm run e2e

# Or prepare/reset the E2E database independently
E2E_DATABASE_URL="postgresql://projecthub:projecthub@localhost:5432/projecthub_e2e" E2E_PASSWORD="<password>" npm run e2e:prepare
```

**Safety Invariant**: The migration and seeding harness strictly refuses to truncate or run against any database whose name does not end in `_e2e`, protecting dev and test databases from accidental modification.

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

- **Stack**: React 18, Vite, TypeScript, Tailwind CSS v3 (Maximalist Editorial palette), React Router v6, Lucide React, React Hook Form + Zod, Vitest + React Testing Library.
- **Design Tokens**: Maximalist Editorial palette (tokens: ink `#1B1410`, paper `#FFF1D6`, surface `#FFFFFF`, primary `#C8381A`, marigold `#FFB627`, teal `#14A38B`, violet `#7A4DE0`, pink `#FF6FAE`, sky `#3DA5F4`, lime `#C6E03B`, coral `#FF8A80`, error `#B3261E`; status badges with 2px ink borders and hard offset shadows; CSS-only dot and stripe patterns). Typography: Fraunces display (variable 700–900), Space Grotesk (UI), Space Mono (labels & meta), self-hosted via npm.
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

---

## Phase 5 — Podman Containerization (Production Stack)

ProjectHub runs as three isolated Podman containers communicating over a dedicated internal bridge network (`projecthub-net`) with a named persistent volume (`projecthub-pgdata`):

| Container | Image | Role | Ports | Healthcheck |
|-----------|-------|------|-------|-------------|
| `projecthub-frontend` | `localhost/projecthub-frontend:v1.0.0` (based on `docker.io/library/nginx:1.30.6-alpine`) | Reverse proxy, static asset server, SPA router, dynamic DNS resolver | `127.0.0.1:3000:80` (only published port) | `wget -qO- http://127.0.0.1/` (interval 5s, retries 5) |
| `projecthub-backend` | `localhost/projecthub-backend:v1.0.0` (based on `docker.io/library/node:22.23.5-bookworm-slim`) | Express API, database migrations on start, non-root `node` user | None (internal `5000/tcp`) | Node HTTP GET `/api/health` (interval 5s, retries 10) |
| `projecthub-db` | `docker.io/library/postgres:16` | PostgreSQL 16 database with persistent storage in `projecthub-pgdata` | None (internal `5432/tcp`) | `pg_isready` (interval 5s, retries 5) |

### Architecture and Design Highlights

1. **Host Binding and Dev Safety**:
   - In development, the backend defaults to `HOST=127.0.0.1`, preventing local dev servers from being reachable on the LAN and avoiding port 5000 collisions with macOS AirPlay.
   - In container runtime, `compose.yaml` explicitly injects `HOST=0.0.0.0` so the backend listens across the container network.
2. **Dynamic Upstream Resolution in Nginx**:
   - Nginx uses a variable-based upstream proxy (`set $backend_upstream http://backend:5000; proxy_pass $backend_upstream;`) combined with a dynamic DNS resolver (`resolver __RESOLVER__ valid=5s ipv6=off;`).
   - At container startup, `/docker-entrypoint.d/99-resolver.sh` reads the container nameserver from `/etc/resolv.conf` (Podman Netavark gateway `10.89.0.1`) and configures Nginx dynamically. This eliminates stale-IP 502 errors when the backend container restarts.
3. **Startup Resilience and Automatic Migrations**:
   - The backend runs a bounded retry loop (30 attempts, 2-second interval) waiting for PostgreSQL before listening.
   - When `RUN_MIGRATIONS_ON_START=true`, database migrations automatically execute under an advisory lock before starting the HTTP server.
4. **Non-Root & Zero-Secret Security**:
   - Backend runtime executes under non-root `USER node` (`uid=1000`).
   - Production images contain zero `.env` files and omit all development dependencies (`typescript`, `vitest`, `ts-node`, `tsx`).
   - Secrets (`POSTGRES_PASSWORD`, `SESSION_SECRET`) are loaded exclusively via environment variables from `.env.compose` (git-ignored).

### Security Notes: Client IP Collapsing in Rootless Podman
Under macOS and rootless Podman (libkrun VM with Netavark + pasta port forwarding), incoming host connections to published ports are translated through the container network gateway interface (`10.89.0.x`).
- **Impact**: Nginx logs and the backend see incoming client requests originating from the gateway IP address (`10.89.0.x`), effectively collapsing external client IPs at the port-forwarding boundary.
- **Rate-Limiter Invariant**: The coarse per-IP ceiling (`RATE_LIMIT_LOGIN_LOOSE_MAX`) is shared across connections arriving through that gateway. However, the primary brute-force defense — the strict login limiter (`RATE_LIMIT_LOGIN_STRICT_MAX`, 5 failed attempts per 15 min) — is keyed by both IP and email (`ip:email`), ensuring individual user accounts remain strictly isolated from one another.

### Verified Podman Operations

```bash
# 1. Configure environment secrets
cp .env.compose.example .env.compose
# Fill with strong alphanumeric secrets (openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# 2. Build images
podman compose --env-file .env.compose build

# 3. Start the entire container stack
podman compose --env-file .env.compose up -d

# 4. Check stack health (all services report healthy)
podman compose --env-file .env.compose ps

# 5. Access the application in your browser
open http://localhost:3000

# 6. Seed demo dataset inside running stack
podman exec -e DEMO_SEED_PASSWORD="<password>" -e ALLOW_DEMO_SEED=true projecthub-backend node dist/scripts/seedDemo.js

# 7. Run E2E Playwright test suite against the containers
E2E_BASE_URL="http://localhost:3000" E2E_PASSWORD="<password>" npm run e2e

# 8. Stop stack (preserves persistent volume)
podman compose --env-file .env.compose down
```

For the comprehensive command reference including inspections, individual lifecycle commands, and plain Podman equivalents, see [docs/podman-commands.md](file:///Users/honharsingh/Documents/linux-project/docs/podman-commands.md).
