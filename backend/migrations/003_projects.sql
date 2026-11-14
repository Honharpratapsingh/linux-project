CREATE TABLE projects (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  created_by      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  guide_id        UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status          TEXT        NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED')),
  submission_date TIMESTAMPTZ NULL,
  completed_at    TIMESTAMPTZ NULL,
  archived_at     TIMESTAMPTZ NULL,
  archived_by     UUID        NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at      TIMESTAMPTZ NULL,
  deleted_by      UUID        NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_projects_deleted_archived CHECK (deleted_at IS NULL OR archived_at IS NOT NULL),
  CONSTRAINT chk_projects_archived_pair CHECK ((archived_at IS NULL) = (archived_by IS NULL)),
  CONSTRAINT chk_projects_deleted_pair CHECK ((deleted_at IS NULL) = (deleted_by IS NULL)),
  CONSTRAINT chk_projects_completed_pair CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL))
);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_guide_id ON projects (guide_id);
CREATE INDEX idx_projects_created_by ON projects (created_by);
CREATE INDEX idx_projects_active ON projects (id) WHERE deleted_at IS NULL;
