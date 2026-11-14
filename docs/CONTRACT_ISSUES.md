# Contract Issues & Backend Compatibility Log

No mismatches found between `docs/API_CONTRACT.md` and the running ProjectHub backend.

All endpoints conform strictly to the contract:
- Authentication & Sessions: `GET /api/auth/csrf`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Directory: `GET /api/faculty`, `GET /api/students/search?email=`.
- Projects: `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PATCH /api/projects/:id`, `DELETE /api/projects/:id`, `GET /api/projects/:id/history`.
- Workflow: `POST /api/projects/:id/submit`, `POST /api/projects/:id/approve`, `POST /api/projects/:id/request-changes`, `POST /api/projects/:id/reject`, `POST /api/projects/:id/complete`, `PATCH /api/projects/:id/archive`, `PATCH /api/projects/:id/restore`.
- Team & Milestones: `POST /api/projects/:id/members`, `DELETE /api/projects/:id/members/:studentId`, `GET/POST/PATCH/DELETE /api/projects/:id/milestones`.
- Feedback: `GET /api/projects/:id/feedback`, `POST /api/projects/:id/feedback`.
- Dashboard: `GET /api/dashboard/summary`.
- Profile: `PATCH /api/profile`, `POST /api/profile/password`.
