-- Users table: covers both STUDENT and FACULTY
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  full_name     TEXT        NOT NULL,
  role          user_role   NOT NULL,
  department    TEXT,
  student_id    TEXT,                    -- populated for STUDENT role
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Soft deletion
  deleted_at    TIMESTAMPTZ,
  deleted_by    UUID        REFERENCES users(id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
