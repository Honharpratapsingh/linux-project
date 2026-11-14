CREATE TABLE milestones (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT        NULL,
  due_date     DATE        NULL,
  is_completed BOOLEAN     NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_milestones_completed CHECK (is_completed = (completed_at IS NOT NULL))
);

CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_milestones_project_id ON milestones (project_id);
