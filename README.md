# ProjectHub

Student Project Tracking and Management System — SRM Institute of Science and Technology  
Course: 21CSE216P (Linux and Container Technologies)

## Phase 1 — Verified Environment

| Tool | Version | Status |
|------|---------|--------|
| Node.js | v22.23.2 | ✅ Available |
| npm | 10.9.8 | ✅ Available |
| git | 2.54.0 | ✅ Available |
| Podman | — | ⚠️ Not installed (required for Phase 5) |
| PostgreSQL client (psql) | — | ⚠️ Not installed (required for Phase 5) |

> **Note:** Podman and PostgreSQL are not installed on this machine. The dev database (Phase 1) requires a running PostgreSQL 16 instance. Install Podman Desktop or use `brew install podman` and `brew install postgresql@16` before running migrations.

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy env
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 3. Run migrations (requires a running PostgreSQL instance)
npm run migrate

# 4. Start backend (port 5000)
npm run dev:backend

# 5. Start frontend (port 5173)
npm run dev:frontend
```

## Verified Commands (Phase 1)

```bash
# Backend health check
curl http://localhost:5000/api/health
# → {"status":"ok","timestamp":"..."}

# Backend unit tests
npm run test --workspace=backend

# Frontend unit tests
npm run test --workspace=frontend
```

## Project Structure

```
projecthub/
├── backend/          # Express + TypeScript API
├── frontend/         # React + Vite + TypeScript
├── db/
│   └── migrations/   # Plain SQL migrations (run in order)
├── docs/
│   └── PROJECT_SPEC.md
├── scripts/
│   └── migrate.ts    # Migration runner
├── .env.example
└── README.md
```

## Roles
- **STUDENT**: Self-registers, creates projects, manages team (up to 3 members), tracks milestones.
- **FACULTY**: Provisioned by admin script. Reviews, approves, rejects, provides feedback, marks complete.

## Workflow Statuses
DRAFT → PENDING_REVIEW → IN_PROGRESS → COMPLETED  
PENDING_REVIEW → CHANGES_REQUESTED → (re-submit) → PENDING_REVIEW  
PENDING_REVIEW → REJECTED (terminal)  
COMPLETED is terminal.
