ALTER TABLE "provider_keys"
    ADD COLUMN IF NOT EXISTS "usage_mode" text NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS "encrypted_metadata" text,
    ADD COLUMN IF NOT EXISTS "metadata_iv" text,
    ADD COLUMN IF NOT EXISTS "metadata_auth_tag" text;
