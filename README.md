# ProjectHub

Student Project Tracking and Management System — SRM Institute of Science and Technology  
Course: 21CSE216P (Linux and Container Technologies)

## Phase 1 — Verified Environment

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

# 4. Start backend (runs on dev port 5001)
npm run dev:backend

# 5. Start frontend (port 5173, proxies /api to port 5001)
npm run dev:frontend
```

## Running Tests

To run the full test suite against the local test database without hardcoded credentials in source files, pass the test database URL in the environment:

```bash
DATABASE_URL=postgresql://projecthub:projecthub@localhost:5432/projecthub_test npm test
```

## Verified Commands (Phase 1)

```bash
# Backend health check (with backend running on dev port 5001)
curl http://127.0.0.1:5001/api/health
# → {"status":"ok","db":"up"}

# Frontend proxy check (with frontend running on 5173 and backend on 5001)
curl http://localhost:5173/api/health
# → {"status":"ok","db":"up"}

# Backend unit and DB invariant tests
DATABASE_URL=postgresql://projecthub:projecthub@localhost:5432/projecthub_test npm run test --workspace=backend

# Frontend unit tests
npm run test --workspace=frontend
```

## Project Structure

```
projecthub/
├── backend/
│   ├── migrations/   # Plain SQL migrations (001 through 008)
│   ├── src/
│   │   ├── config/   # Environment config (env.ts defaults to port 5000)
│   │   ├── db/       # Pool and migration runner
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.ts
│   │   └── server.ts
│   └── package.json
├── frontend/         # React + Vite + Tailwind (warm pastel editorial tokens)
│   ├── src/
│   │   ├── lib/      # api.ts fetch skeleton
│   │   ├── pages/    # HomePage placeholder
│   │   └── index.css
│   └── package.json
├── docs/
│   └── PROJECT_SPEC.md  # Authoritative condensed specification
├── scripts/
│   └── dev-db.sh     # Dev container launcher (Podman)
├── .env.example
├── package.json
└── README.md
```

## Roles
- **STUDENT**: Self-registers, creates projects, manages team (up to 3 members), tracks milestones.
- **FACULTY**: Provisioned by admin script. Reviews, approves, rejects, provides feedback, marks complete.

## Workflow Statuses & Transitions
```
DRAFT → PENDING_REVIEW              (student submits)
PENDING_REVIEW → IN_PROGRESS        (faculty approves)
PENDING_REVIEW → CHANGES_REQUESTED  (faculty requests changes)
PENDING_REVIEW → REJECTED           (faculty rejects)
CHANGES_REQUESTED → PENDING_REVIEW  (student resubmits)
REJECTED → PENDING_REVIEW           (student resubmits)
IN_PROGRESS → COMPLETED             (faculty marks complete)
```
