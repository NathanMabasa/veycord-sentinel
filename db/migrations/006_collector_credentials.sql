CREATE TABLE collector_credentials (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  source varchar(80) NOT NULL CHECK (source ~ '^[a-z][a-z0-9._-]{0,79}$'),
  token_hash char(64) NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL CHECK (expires_at > created_at),
  revoked_at timestamptz,
  window_start timestamptz,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 11),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, token_hash)
);
ALTER TABLE collector_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_credentials FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON collector_credentials
  USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
GRANT SELECT ON collector_credentials TO sentinel_app;
GRANT UPDATE (window_start, request_count) ON collector_credentials TO sentinel_app;

ALTER TABLE audit_entries DROP CONSTRAINT audit_entries_actor_check;
ALTER TABLE audit_entries ADD CONSTRAINT audit_entries_actor_check
  CHECK (actor IN ('operator-service','maintenance','user','collector'));
ALTER TABLE audit_entries DROP CONSTRAINT audit_entries_action_check;
ALTER TABLE audit_entries ADD CONSTRAINT audit_entries_action_check
  CHECK (action IN ('events.ingested','case.created','case.updated','retention.applied','limits.updated','collector.issued','collector.revoked'));
