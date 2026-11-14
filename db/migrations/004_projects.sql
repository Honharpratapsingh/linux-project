-- Projects table
CREATE TABLE projects (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT           NOT NULL,
  description     TEXT           NOT NULL,
  status          project_status NOT NULL DEFAULT 'DRAFT',
  owner_id        UUID           NOT NULL REFERENCES users(id),
  guide_id        UUID           REFERENCES users(id),   -- assigned FACULTY guide
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  -- Archiving (independent of status)
  archived_at     TIMESTAMPTZ,
  archived_by     UUID           REFERENCES users(id),
  -- Soft deletion (independent of status)
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID           REFERENCES users(id),
  -- Review cycle tracking
  submitted_at    TIMESTAMPTZ,                           -- last PENDING_REVIEW transition
  reviewed_at     TIMESTAMPTZ,                           -- last faculty action
  reviewed_by     UUID           REFERENCES users(id),
  completed_at    TIMESTAMPTZ                            -- set when COMPLETED
);

CREATE INDEX idx_projects_owner_id  ON projects(owner_id);
CREATE INDEX idx_projects_guide_id  ON projects(guide_id);
CREATE INDEX idx_projects_status    ON projects(status);
