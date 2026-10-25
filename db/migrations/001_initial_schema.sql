CREATE TABLE workspaces (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  event_id varchar(200) NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 200),
  timestamp timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  event varchar(500) NOT NULL CHECK (char_length(event) BETWEEN 1 AND 500),
  source varchar(128) NOT NULL CHECK (char_length(source) BETWEEN 1 AND 128),
  host varchar(255) NOT NULL CHECK (char_length(host) BETWEEN 1 AND 255),
  event_user varchar(255),
  src_ip varchar(80),
  severity varchar(16) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  outcome varchar(80),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw text,
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, source, event_id),
  CHECK (event_user IS NULL OR char_length(event_user) <= 255),
  CHECK (src_ip IS NULL OR char_length(src_ip) <= 80),
  CHECK (outcome IS NULL OR char_length(outcome) <= 80),
  CHECK (octet_length(raw) <= 32768)
);
CREATE INDEX events_workspace_time_id_idx ON events (workspace_id, timestamp DESC, id DESC);
CREATE INDEX events_workspace_source_time_idx ON events (workspace_id, source, timestamp DESC);
CREATE INDEX events_workspace_severity_time_idx ON events (workspace_id, severity, timestamp DESC);

CREATE TABLE findings (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  event_uuid uuid NOT NULL,
  rule_id varchar(120) NOT NULL CHECK (char_length(rule_id) BETWEEN 1 AND 120),
  name varchar(200) NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  severity varchar(16) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  technique_id varchar(40) NOT NULL CHECK (char_length(technique_id) BETWEEN 1 AND 40),
  reason varchar(1000) NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (workspace_id, event_uuid, rule_id),
  FOREIGN KEY (workspace_id, event_uuid) REFERENCES events(workspace_id, id) ON DELETE CASCADE,
  CHECK (jsonb_typeof(evidence) = 'array' AND octet_length(evidence::text) <= 16384)
);
CREATE INDEX findings_workspace_created_idx ON findings (workspace_id, created_at DESC, id DESC);

CREATE TABLE cases (
  id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title varchar(200) NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  note varchar(5000) NOT NULL DEFAULT '' CHECK (char_length(note) <= 5000),
  status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  finding_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, finding_id) REFERENCES findings(workspace_id, id) ON DELETE RESTRICT
);
CREATE INDEX cases_workspace_status_updated_idx ON cases (workspace_id, status, updated_at DESC, id DESC);

DO $$
DECLARE
  table_name text;
  tenant_column text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['workspaces', 'events', 'findings', 'cases'] LOOP
    tenant_column := CASE WHEN table_name = 'workspaces' THEN 'id' ELSE 'workspace_id' END;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY workspace_isolation ON %I USING (%I = NULLIF(current_setting(''app.workspace_id'', true), '''')::uuid) WITH CHECK (%I = NULLIF(current_setting(''app.workspace_id'', true), '''')::uuid)',
      table_name, tenant_column, tenant_column
    );
  END LOOP;
END
$$;

GRANT USAGE ON SCHEMA public TO sentinel_app;
GRANT SELECT ON workspaces TO sentinel_app;
GRANT SELECT, INSERT ON events TO sentinel_app;
GRANT SELECT, INSERT ON findings TO sentinel_app;
GRANT SELECT, INSERT, UPDATE ON cases TO sentinel_app;
