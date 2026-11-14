CREATE TABLE users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT        NOT NULL,
  email               TEXT        NOT NULL,
  password_hash       TEXT        NOT NULL,
  role                TEXT        NOT NULL CHECK (role IN ('STUDENT', 'FACULTY')),
  registration_number TEXT        NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_lower_email ON users (lower(email));

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
