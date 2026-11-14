CREATE TABLE project_feedback (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  faculty_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  message       TEXT        NOT NULL,
  feedback_type TEXT        NOT NULL CHECK (feedback_type IN ('COMMENT', 'APPROVAL', 'CHANGES_REQUESTED', 'REJECTION')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_feedback_project_created ON project_feedback (project_id, created_at);
