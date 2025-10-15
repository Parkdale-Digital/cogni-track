---
id: troubleshooting
title: Troubleshooting Guide
description: Common setup, ingestion, and documentation issues with fixes.
sidebar_position: 6
---

Use this guide to diagnose and resolve frequent issues across local development, ingestion workflows, cron automation, and documentation builds.

## Local Environment

### Dev server port confusion
- **Issue:** Server appears on a different port than expected.
- **Cause:** `npm run dev` uses `next dev -p 5000`.
- **Fix:** Visit `http://localhost:5000` or update the script locally.

### `ENCRYPTION_KEY environment variable is required`
- **Cause:** AES-256-GCM key is missing.
- **Fix:** Generate a 32-byte key (`openssl rand -base64 32`), set `ENCRYPTION_KEY` and `ENCRYPTION_MASTER_KEY` in `.env.local`, then restart the server.

### Database connection errors (`ECONNREFUSED`, missing connection string)
- **Cause:** `LOCAL_DATABASE_URL` or `DATABASE_URL` is unset or incorrect.
- **Fix:** Populate `.env.local` with a valid Postgres URL (Neon or local). Routes fall back to `{ keys: [] }` with header `x-db-off: true` when Postgres is offline.

### Clerk authentication not loading
- **Cause:** Missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `CLERK_SECRET_KEY`.
- **Fix:** Configure both keys. `SafeClerkProvider` provides a degraded experience, but protected routes still require real sessions.

## Ingestion & Usage Data

### Telemetry `CONFIGURATION_ERROR`
- **Cause:** Admin mode keys lack organization/project metadata.
- **Fix:** Update the key to include `organizationId` and `projectId` (normalized as `org-` / `proj_`).

### `SCHEMA_MISSING` from `fetchAndStoreUsageForUser`
- **Fix:** Apply migration `drizzle/0003_usage_event_windows.sql`, rerun ingestion, and re-test.

### `usageFetcher security pagination tests failed`
- **Cause:** Pagination sanitisation changed.
- **Fix:** Ensure `sanitizeAdminNextPageUrlForTest` rejects unexpected hosts/paths and update tests accordingly.

### Cron endpoint returns `401`
- **Cause:** Missing or incorrect `CRON_SECRET`.
- **Fix:** Supply the correct bearer token via Vercel Cron or scripts.

### Cron returns `503`
- **Cause:** `CRON_SECRET` unset (`undefined`/`null` strings are rejected).
- **Fix:** Set the secret in environment variables and redeploy.

### Cron telemetry shows `simulatedKeys > 0`
- **Cause:** `ENABLE_SIMULATED_USAGE` enabled or OpenAI credentials lack admin scope.
- **Fix:** Disable simulation for real runs and validate credentials with `scripts/admin-usage-sample.ts`.

### Analytics page warns about missing columns
- **Cause:** Daily metadata columns not migrated.
- **Fix:** Apply latest migrations and rerun ingestion.

## Scripts & Tooling

### `scripts/usage-backfill.ts` exits with “Unknown argument”
- **Fix:** Provide values for each flag (`--user`, `--days`, `--start`, etc.) or run with `--help`.

### `usage-telemetry-diff` cannot connect
- **Fix:** Provide a Neon HTTP URL via `DATABASE_URL` or pass `--skip-db`.

### Drizzle commands complain about missing URL
- **Fix:** Export `DRIZZLE_DATABASE_URL`, `LOCAL_DATABASE_URL`, or `DATABASE_URL` before running `drizzle-kit`.

## Documentation Site

### `npm run docs:build` fails
- **Causes:** Missing frontmatter, malformed Markdown tables, broken links.
- **Fix:** Review the error output, ensure pages comply with [Documentation Contribution Guide](../contributing/documentation.md), and run `npx markdown-link-check -q -r docs-site/docs`.

### Docs dev server port conflict
- **Fix:** Stop the conflicting process or run `npm run docs -- --port 3002`.

## Testing & CI

### `npm test` fails due to Postgres errors
- **Fix:** Ensure `LOCAL_DATABASE_URL` points to a live database or enable simulated usage for sandbox tests.

### Docs CI fails on `markdown-link-check`
- **Fix:** Run `npx markdown-link-check -q -r docs-site/docs` locally and fix or ignore broken links as appropriate.

### GitHub Pages deployment fails
- **Fix:** Reproduce locally with `npm run docs:build` and confirm static assets (e.g., `/specs/openapi.documented.yml`) exist.

## When to Escalate

- Log discrepancies in `memorybank/context_gaps_log.md` and reduce confidence scores.
- Pause cron jobs and escalate if telemetry detects data loss or >2% variance (see [Daily Usage Cron Runbook](daily-usage-cron-runbook.md)).
- Follow the Escalation Mode guidance in `AGENTS.md` when confidence drops below 5/10 or risk exceeds 7/10.

Document new issues here as they surface so future contributors can resolve them quickly.
