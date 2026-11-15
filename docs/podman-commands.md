# Podman Command Reference (ProjectHub)

This document provides all operational commands for containerizing, managing, inspecting, and deploying ProjectHub using Podman and podman-compose.

---

## 1. Prerequisites and Machine Lifecycle

```bash
# Check Podman version and machine status [VERIFIED]
podman --version
podman machine list

# Start Podman machine if stopped [VERIFIED]
podman machine start

# Inspect system and rootless network backend [VERIFIED]
podman info --format 'rootless: {{.Host.Security.Rootless}}, cgroups: {{.Host.CgroupsVersion}}, networkBackend: {{.Host.NetworkBackend}}'

# Verify port 3000 is available [VERIFIED]
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

---

## 2. Image Build Workflow

```bash
# Build both frontend and backend images via Compose [VERIFIED]
podman compose --env-file .env.compose build

# Alternatively, build each image manually via Podman CLI [VERIFIED]
podman build -t projecthub-backend:v1.0.0 -f backend/Containerfile .
podman build -t projecthub-frontend:v1.0.0 -f frontend/Containerfile .

# List local images and check sizes [VERIFIED]
podman images --filter "reference=projecthub-*"
```

---

## 3. Starting and Stopping the Stack

```bash
# Start all services detached with environment configuration [VERIFIED]
podman compose --env-file .env.compose up -d

# Check stack container status and health via Compose [VERIFIED]
podman compose --env-file .env.compose ps

# Check stack container status via standard Podman CLI [VERIFIED]
podman ps --filter "name=projecthub"

# Follow logs for all services [VERIFIED]
podman compose --env-file .env.compose logs -f

# Follow logs for a specific service [VERIFIED]
podman logs -f projecthub-backend
podman logs -f projecthub-frontend
podman logs -f projecthub-db

# Stop and remove containers and network (preserves named volume) [VERIFIED]
podman compose --env-file .env.compose down

# WARNING: Teardown with volume removal destroys persistent database data [VERIFIED]
# podman compose --env-file .env.compose down -v
```

---

## 4. Container Lifecycle and Restarts

```bash
# Restart backend service [VERIFIED]
podman restart projecthub-backend

# Restart service via compose [VERIFIED]
podman compose --env-file .env.compose restart backend

# Graceful stop timing verification [VERIFIED]
time podman stop projecthub-backend
podman start projecthub-backend
```

---

## 5. Inspection and Verification

```bash
# Inspect dedicated container network [VERIFIED]
podman network inspect projecthub-net

# Inspect PostgreSQL named volume [VERIFIED]
podman volume inspect projecthub-pgdata
podman volume ls --filter "name=projecthub"

# Verify port publishing (only frontend publishes 127.0.0.1:3000) [VERIFIED]
podman port projecthub-frontend
podman port projecthub-backend  # Returns empty (no published port)
podman port projecthub-db       # Returns empty (no published port)

# Test health endpoint through Nginx reverse proxy [VERIFIED]
curl -i http://localhost:3000/api/health

# Test SPA routing through Nginx [VERIFIED]
curl -i http://localhost:3000/projects

# Test static asset caching headers [VERIFIED]
curl -I http://localhost:3000/
```

---

## 6. Database Provisioning and Seeding via `podman exec`

Execute administrative scripts directly inside the running backend container using inline environment variables:

```bash
# Provision a new Faculty account [VERIFIED]
podman exec \
  -e FACULTY_NAME="Dr. Container Faculty" \
  -e FACULTY_EMAIL="faculty.container@demo.projecthub.test" \
  -e FACULTY_PASSWORD="container-password-here" \
  projecthub-backend node dist/scripts/provisionFaculty.js

# Seed demo dataset (9 projects, 3 faculty, 6 students) [VERIFIED]
podman exec \
  -e DEMO_SEED_PASSWORD="demo-password-here" \
  -e ALLOW_DEMO_SEED=true \
  projecthub-backend node dist/scripts/seedDemo.js
```

---

## 7. Equivalent Plain Podman Commands (Without Compose)

To run the entire ProjectHub infrastructure manually using standard `podman` CLI commands:

```bash
# 1. Create dedicated network [VERIFIED]
podman network create projecthub-net

# 2. Create PostgreSQL data volume [VERIFIED]
podman volume create projecthub-pgdata

# 3. Run PostgreSQL container [VERIFIED]
podman run -d \
  --name projecthub-db \
  --restart unless-stopped \
  --network projecthub-net \
  -v projecthub-pgdata:/var/lib/postgresql/data \
  -e POSTGRES_USER=projecthub \
  -e POSTGRES_PASSWORD=YOUR_PASSWORD \
  -e POSTGRES_DB=projecthub_production \
  --health-cmd "pg_isready -U projecthub -d projecthub_production" \
  --health-interval 5s \
  --health-retries 5 \
  docker.io/library/postgres:16

# 4. Run Backend container (after DB is healthy) [VERIFIED]
podman run -d \
  --name projecthub-backend \
  --restart unless-stopped \
  --network projecthub-net \
  -e DATABASE_URL="postgresql://projecthub:YOUR_PASSWORD@projecthub-db:5432/projecthub_production" \
  -e SESSION_SECRET="YOUR_SESSION_SECRET_MIN_32_CHARS" \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e TRUST_PROXY_HOPS=1 \
  -e COOKIE_SECURE=auto \
  -e ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000" \
  -e RUN_MIGRATIONS_ON_START="true" \
  --health-cmd "node -e \"const h=require('http');h.get('http://127.0.0.1:5000/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))\"" \
  --health-interval 5s \
  --health-retries 10 \
  projecthub-backend:v1.0.0

# 5. Run Frontend container [VERIFIED]
podman run -d \
  --name projecthub-frontend \
  --restart unless-stopped \
  --network projecthub-net \
  -p 127.0.0.1:3000:80 \
  --health-cmd "wget -qO- http://127.0.0.1/ > /dev/null 2>&1 || exit 1" \
  --health-interval 5s \
  --health-retries 5 \
  projecthub-frontend:v1.0.0
```

---

## 8. Container Registry Workflow (GitHub Container Registry)

> **Status: UNVERIFIED / NOT RUN** (No credentials configured; demonstration purposes only)

```bash
# 1. Login to GitHub Container Registry (ghcr.io) [NOT RUN]
echo "$CR_PAT" | podman login ghcr.io -u "<GITHUB_USERNAME>" --password-stdin

# 2. Tag local images for remote registry [NOT RUN]
podman tag projecthub-backend:v1.0.0 ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0
podman tag projecthub-frontend:v1.0.0 ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0

# 3. Push images to remote registry [NOT RUN]
podman push ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0
podman push ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0

# 4. Pull images on deployment target [NOT RUN]
podman pull ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0
podman pull ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0
```

---

## 9. Multi-Architecture Manifest Build

> **Status: UNVERIFIED / NOT RUN** (Multi-platform builds require cross-emulation or multi-arch runners)

```bash
# Build multi-architecture manifest for amd64 and arm64 [NOT RUN]
podman build --platform linux/amd64,linux/arm64 \
  --manifest ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0 \
  -f backend/Containerfile .

podman build --platform linux/amd64,linux/arm64 \
  --manifest ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0 \
  -f frontend/Containerfile .

# Push multi-arch manifests [NOT RUN]
podman manifest push --all ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0 docker://ghcr.io/<NAMESPACE>/projecthub-backend:v1.0.0
podman manifest push --all ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0 docker://ghcr.io/<NAMESPACE>/projecthub-frontend:v1.0.0
```
