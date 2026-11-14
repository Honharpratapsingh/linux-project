-- connect-pg-simple session store (compatible schema)
CREATE TABLE session (
  sid    VARCHAR      NOT NULL PRIMARY KEY,
  sess   JSONB        NOT NULL,
  expire TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_session_expire ON session(expire);
