-- Draft migration for OpenAI admin data surfaces.
-- Generated manually on 2025-09-29; review with Data/Infra before applying.

BEGIN;

CREATE TABLE IF NOT EXISTS "openai_projects" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "status" text NOT NULL,
    "archived_at" timestamp,
    "created_at" timestamp NOT NULL,
    "updated_at" timestamp,
    "billing_reference_type" text,
    "billing_reference_id" text
);

CREATE TABLE IF NOT EXISTS "openai_project_members" (
    "id" text PRIMARY KEY,
    "project_id" text NOT NULL REFERENCES "openai_projects"("id") ON DELETE CASCADE,
    "user_id" text NOT NULL,
    "email" text,
    "role" text NOT NULL,
    "invited_at" timestamp,
    "added_at" timestamp,
    "removed_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "openai_proj_members_project_user_idx"
    ON "openai_project_members" ("project_id", "user_id");

CREATE TABLE IF NOT EXISTS "openai_service_accounts" (
    "id" text PRIMARY KEY,
    "project_id" text NOT NULL REFERENCES "openai_projects"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "role" text NOT NULL,
    "created_at" timestamp NOT NULL,
    "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "openai_service_account_keys" (
    "id" text PRIMARY KEY,
    "service_account_id" text NOT NULL REFERENCES "openai_service_accounts"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "redacted_value" text NOT NULL,
    "created_at" timestamp NOT NULL,
    "last_used_at" timestamp,
    "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "openai_certificates" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "status" text NOT NULL,
    "fingerprint" text NOT NULL,
    "valid_at" timestamp,
    "expires_at" timestamp,
    "created_at" timestamp NOT NULL,
    "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "openai_certificate_events" (
    "id" text PRIMARY KEY,
    "certificate_id" text NOT NULL REFERENCES "openai_certificates"("id") ON DELETE CASCADE,
    "action" text NOT NULL,
    "actor_id" text,
    "occurred_at" timestamp NOT NULL,
    "metadata" jsonb
);

CREATE TABLE IF NOT EXISTS "openai_admin_cursors" (
    "endpoint" text PRIMARY KEY,
    "next_page" text,
    "version" integer NOT NULL DEFAULT 1,
    "last_synced_at" timestamp,
    "window_start" timestamp,
    "window_end" timestamp,
    "error_count" integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_admin_bucket_idx"
    ON "usage_events" ("timestamp", "model", "key_id");

COMMIT;
