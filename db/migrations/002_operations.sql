ALTER TABLE workspaces
  ADD COLUMN max_events bigint NOT NULL DEFAULT 100000 CHECK (max_events BETWEEN 1 AND 100000000),
  ADD COLUMN max_event_bytes bigint NOT NULL DEFAULT 104857600 CHECK (max_event_bytes BETWEEN 1 AND 1099511627776),
  ADD COLUMN max_cases integer NOT NULL DEFAULT 1000 CHECK (max_cases BETWEEN 1 AND 1000000),
  ADD COLUMN retention_days integer NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 3650);

ALTER TABLE events ADD COLUMN quota_bytes bigint;
UPDATE events e SET quota_bytes = octet_length(jsonb_build_object(
  'eventId', e.event_id,
  'timestamp', to_char(e.timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'event', e.event,
  'source', e.source,
  'host', e.host,
  'user', e.event_user,
  'srcIp', e.src_ip,
  'severity', e.severity,
  'outcome', e.outcome,
  'attributes', e.attributes,
  'raw', e.raw
)::text);
ALTER TABLE events ALTER COLUMN quota_bytes SET NOT NULL;
ALTER TABLE events ALTER COLUMN quota_bytes SET DEFAULT 0;
ALTER TABLE events ADD CONSTRAINT events_quota_bytes_positive CHECK (quota_bytes > 0);

CREATE INDEX events_workspace_received_idx ON events (workspace_id, received_at, id);
CREATE INDEX cases_workspace_finding_idx ON cases (workspace_id, finding_id) WHERE finding_id IS NOT NULL;

CREATE TABLE audit_entries (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  action varchar(32) NOT NULL CHECK (action IN ('events.ingested', 'case.created', 'case.updated', 'retention.applied', 'limits.updated')),
  actor varchar(32) NOT NULL CHECK (actor IN ('operator-service', 'maintenance')),
  resource_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (workspace_id, id),
  CHECK (jsonb_typeof(details) = 'object' AND octet_length(details::text) <= 2048)
);
CREATE INDEX audit_workspace_occurred_idx ON audit_entries (workspace_id, occurred_at DESC, id DESC);
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON audit_entries
  USING (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true), '')::uuid);
GRANT SELECT, INSERT ON audit_entries TO sentinel_app;
