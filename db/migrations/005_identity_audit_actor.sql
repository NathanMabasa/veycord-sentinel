ALTER TABLE audit_entries DROP CONSTRAINT audit_entries_actor_check;
ALTER TABLE audit_entries ADD CONSTRAINT audit_entries_actor_check CHECK (actor IN ('operator-service','maintenance','user'));
