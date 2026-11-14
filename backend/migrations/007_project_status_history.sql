CREATE TABLE project_status_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  previous_status TEXT        NULL CHECK (previous_status IS NULL OR previous_status IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED')),
  new_status      TEXT        NOT NULL CHECK (new_status IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED')),
  changed_by      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason          TEXT        NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_status_history_project_created ON project_status_history (project_id, created_at);
