-- Stable keys: at most three rows per operator-provisioned membership, never per request/session/IP.
CREATE TABLE workspace_budget (
  workspace_id uuid NOT NULL,
  user_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('read', 'ingest', 'case-write')),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 1 AND CASE WHEN kind = 'read' THEN 61 ELSE 11 END),
  PRIMARY KEY (workspace_id, user_id, kind),
  FOREIGN KEY (user_id, workspace_id) REFERENCES memberships(user_id, workspace_id) ON DELETE CASCADE
);
