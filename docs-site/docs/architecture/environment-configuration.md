---
title: Environment Configuration
description: Environment variables, secrets management, and deployment configuration
sidebar_position: 5
---

## Overview

CogniTrack uses environment variables to manage credentials, feature flags, and
ingestion settings. This guide explains the required configuration for local
development, staging rehearsals, and production deployments without exposing
time-bound secrets.

## Environment Files

- `.env.local` stores application secrets for local development. Never commit
  this file; use placeholder values when sharing examples.
- `.envrc` loads `.env.local` via `direnv` so shells and scripts share the same
  configuration.
- Vercel environments mirror these variables. Update the Vercel dashboard
  whenever secrets rotate.

## Core Variables

- **`DATABASE_URL`**: Primary Postgres connection string. Use Neon credentials in
  production and require SSL.
- **`LOCAL_DATABASE_URL`**: Local Postgres instance for development and testing.
  Keep credentials scoped to your machine.
- **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**: Public Clerk key required for frontend
  auth flows. Safe for client exposure but still managed via env vars.
- **`CLERK_SECRET_KEY`**: Server-side Clerk API access. Rotate through the Clerk
  dashboard and avoid logging the value.
- **`ENCRYPTION_KEY`**: 32-byte base64 key used by
  [`src/lib/encryption.ts`](../../../src/lib/encryption.ts) for AES-GCM
  operations. Required for encrypting provider credentials; rotate if leaked.
- **`ENCRYPTION_MASTER_KEY`**: Master key for envelope encryption workflows.
  Store alongside `ENCRYPTION_KEY` in a managed secret vault.
- **`CRON_SECRET`**: Bearer token that secures cron endpoints. Must match the
  automation workflows invoking `/api/cron/*` routes.
- **`OPENAI_API_KEY`**: OpenAI API key used for ingestion. Provide admin-scoped
  keys when enabling organization-wide mode.
- **`OPENAI_ORGANIZATION`**: Organization identifier required for admin
  ingestion. Validate before enabling admin mode.
- **`OPENAI_PROJECT`**: Project identifier used with admin endpoints. Stored
  encrypted and required for admin requests.
- **`OPENAI_USAGE_MODE`**: `standard` or `admin`; controls the default ingestion
  mode. Defaults to `standard` when unset.
- **`OPENAI_PRICING_OVERRIDES`**: JSON overrides for the pricing map. Ensure the
  value parses correctly before deployment.

## Feature Flags & Toggles

- `ENABLE_DAILY_USAGE_WINDOWS`: Enables ingestion of window metadata and related
  schema paths.
- `ENABLE_USAGE_ADMIN_CONSTRAINT_UPSERT`: Activates constraint-based dedupe once
  migrations and driver support are confirmed.
- `ENABLE_SIMULATED_USAGE`: Allows simulated events for sandbox testing; keep
  disabled in production.
- `DAILY_USAGE_CONTRACT_FIXTURES_READY`, `DAILY_USAGE_CONTRACT_EXPECTED_TOTALS_DIR`,
  and related flags control contract test execution.

Store feature flag values as strings (`"true"` / `"false"`) to match runtime
parsing.

## Secrets Management

- Generate cryptographic keys (`ENCRYPTION_KEY`, `ENCRYPTION_MASTER_KEY`,
  `CRON_SECRET`) with secure tooling and store them in a vault or secrets
  manager.
- Rotate provider keys immediately if they appear in logs or incident reports.
- Audit access to `.env.local` and Vercel secrets; maintain change history in
  the security controls reference.

## Deployment Checklists

- Confirm all required variables exist before promoting new deployments.
  Missing keys cause runtime errors in ingestion flows.
- Staging rehearsals should use sanitized fixtures and temporary provider keys.
  Document rehearsals under `audit/cron-dry-run/`.
- Production deployments must validate parity diffs and cost reconciliations
  prior to enabling feature flags for new providers.

## Security Considerations

- Never embed secrets in documentation or sample code. Use placeholders
  (`OPENAI_API_KEY=sk-your-key`) when demonstrating configuration.
- Ensure Git hooks or CI guardrails prevent accidental commits of `.env.local`
  files.
- Grant least-privilege access to environment management tools; document RBAC
  mapping in the security controls doc.

## Related Documentation

- [Usage Ingestion Pipeline](./usage-ingestion-pipeline.md)
- [Telemetry & Observability](./telemetry-and-observability.md)
- [Beta Readiness Tracker](../product/beta-readiness-tracker.md)
