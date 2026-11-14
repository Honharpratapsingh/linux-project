-- Immutable audit log for status transitions and key actions
CREATE TABLE audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT        NOT NULL,                      -- e.g. 'project', 'milestone'
  entity_id   UUID        NOT NULL,
  action      TEXT        NOT NULL,                      -- e.g. 'status_change', 'member_added'
  old_value   JSONB,
  new_value   JSONB,
  performed_by UUID       REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_performed_by ON audit_log(performed_by);
