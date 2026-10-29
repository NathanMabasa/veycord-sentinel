-- Generated from pinned Better Auth 1.7.14 configuration; reviewed separately from runtime.
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "twoFactorEnabled" boolean);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade, "mfaVerifiedAt" timestamptz, "lastActiveAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "twoFactor" ("id" text not null primary key, "secret" text not null, "backupCodes" text not null, "userId" text not null references "user" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

create index "twoFactor_secret_idx" on "twoFactor" ("secret");

create index "twoFactor_userId_idx" on "twoFactor" ("userId");

-- Application-owned authorization. The identity runtime can read, never grant membership.
CREATE TABLE memberships (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  role text NOT NULL CHECK (role IN ('admin','analyst','viewer')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id,workspace_id)
);
CREATE TABLE request_budget (bucket text PRIMARY KEY,started_at timestamptz NOT NULL,attempts integer NOT NULL);
CREATE TABLE security_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),occurred_at timestamptz NOT NULL DEFAULT now(),action text NOT NULL CHECK (length(action)<=80),user_id text,success boolean NOT NULL);
CREATE INDEX security_audit_time_idx ON security_audit(occurred_at DESC);
-- Closed-lab capacity guard. Reaching a cap fails closed; operator maintenance is explicit.
CREATE FUNCTION enforce_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sentinel_identity AS $$
DECLARE used bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(728240035);
  EXECUTE format('SELECT count(*) FROM sentinel_identity.%I',TG_TABLE_NAME) INTO used;
  IF used >= (CASE WHEN TG_TABLE_NAME='security_audit' THEN 100000 ELSE 10000 END) THEN
    RAISE EXCEPTION 'Identity capacity reached';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION enforce_capacity() FROM PUBLIC;
CREATE TRIGGER identity_user_capacity BEFORE INSERT ON "user" FOR EACH ROW EXECUTE FUNCTION enforce_capacity();
CREATE TRIGGER identity_session_capacity BEFORE INSERT ON session FOR EACH ROW EXECUTE FUNCTION enforce_capacity();
CREATE TRIGGER identity_verification_capacity BEFORE INSERT ON verification FOR EACH ROW EXECUTE FUNCTION enforce_capacity();
CREATE TRIGGER identity_audit_capacity BEFORE INSERT ON security_audit FOR EACH ROW EXECUTE FUNCTION enforce_capacity();
