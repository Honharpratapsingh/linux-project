-- Faculty feedback on projects (linked to review cycles)
CREATE TABLE feedback (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES users(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_project_id ON feedback(project_id);
CREATE INDEX idx_feedback_author_id  ON feedback(author_id);
