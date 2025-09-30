[dotenv@17.2.2] injecting env (10) from .env.local -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit
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

ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_key_id_provider_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."provider_keys"("id") ON DELETE cascade ON UPDATE no action;
