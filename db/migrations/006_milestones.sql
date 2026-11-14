-- Project milestones
CREATE TABLE milestones (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID             NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT             NOT NULL,
  description TEXT,
  due_date    DATE,
  status      milestone_status NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ      NOT NULL DEFAULT now(),
  -- Soft deletion
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID             REFERENCES users(id)
);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_status     ON milestones(status);
