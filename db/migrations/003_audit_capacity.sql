ALTER TABLE workspaces
  ADD COLUMN max_audit_entries integer NOT NULL DEFAULT 200000
  CHECK (max_audit_entries BETWEEN 1 AND 10000000);
