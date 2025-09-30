[dotenv@17.2.2] injecting env (10) from .env.local -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit
CREATE TABLE "openai_admin_cursors" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"next_page" text,
	"version" integer DEFAULT 1 NOT NULL,
	"last_synced_at" timestamp,
	"window_start" timestamp,
	"window_end" timestamp,
	"error_count" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "openai_certificate_events" (
	"id" text PRIMARY KEY NOT NULL,
	"certificate_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text,
	"occurred_at" timestamp NOT NULL,
	"metadata" jsonb
);

CREATE TABLE "openai_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"fingerprint" text NOT NULL,
	"valid_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp
);

CREATE TABLE "openai_project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"email" text,
	"role" text NOT NULL,
	"invited_at" timestamp,
	"added_at" timestamp,
	"removed_at" timestamp
);

CREATE TABLE "openai_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"billing_reference_type" text,
	"billing_reference_id" text
);

CREATE TABLE "openai_service_account_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"service_account_id" text NOT NULL,
	"name" text NOT NULL,
	"redacted_value" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"last_used_at" timestamp,
	"deleted_at" timestamp
);

CREATE TABLE "openai_service_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"deleted_at" timestamp
);

CREATE TABLE "provider_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"usage_mode" text DEFAULT 'standard' NOT NULL,
	"encrypted_metadata" text,
	"metadata_iv" text,
	"metadata_auth_tag" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"key_id" integer NOT NULL,
	"model" text NOT NULL,
	"tokens_in" integer DEFAULT 0,
	"tokens_out" integer DEFAULT 0,
	"cost_estimate" numeric(10, 6) DEFAULT '0',
	"timestamp" timestamp NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "openai_certificate_events" ADD CONSTRAINT "openai_certificate_events_certificate_id_openai_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."openai_certificates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "openai_project_members" ADD CONSTRAINT "openai_project_members_project_id_openai_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."openai_projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "openai_service_account_keys" ADD CONSTRAINT "openai_service_account_keys_service_account_id_openai_service_accounts_id_fk" FOREIGN KEY ("service_account_id") REFERENCES "public"."openai_service_accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "openai_service_accounts" ADD CONSTRAINT "openai_service_accounts_project_id_openai_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."openai_projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_key_id_provider_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."provider_keys"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX "openai_proj_members_project_user_idx" ON "openai_project_members" USING btree ("project_id","user_id");
CREATE UNIQUE INDEX "usage_admin_bucket_idx" ON "usage_events" USING btree ("timestamp","model","key_id");
