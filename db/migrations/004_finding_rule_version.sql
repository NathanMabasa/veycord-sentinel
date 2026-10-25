-- Preserve the evaluated rule revision without rewriting legacy evidence.
-- NULL deliberately means unknown, including hand-authored seed findings.
ALTER TABLE findings ADD COLUMN rule_version varchar(32)
  CHECK (rule_version IS NULL OR rule_version ~ '^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$');
