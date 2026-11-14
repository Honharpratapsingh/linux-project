CREATE TABLE project_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  student_id      UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  membership_role TEXT        NOT NULL CHECK (membership_role IN ('LEAD', 'MEMBER')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_project_members_project_student UNIQUE (project_id, student_id)
);

CREATE UNIQUE INDEX idx_project_members_single_lead ON project_members (project_id) WHERE membership_role = 'LEAD';
CREATE INDEX idx_project_members_student_id ON project_members (student_id);
