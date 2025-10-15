# Troubleshooting CogniTrack

Use this guide to resolve common setup, ingestion, and documentation issues. Each section links to relevant code paths or runbooks for deeper context.

## Local Environment & Setup

### Next.js dev server runs on the wrong port
- **Symptom:** The README or docs mention port 3000, but the server starts elsewhere.
- **Cause:** `package.json` pins `npm run dev` to port **5000**.
- **Fix:** Visit `http://localhost:5000` or change the script locally if you need a different port.

### `ENCRYPTION_KEY environment variable is required`
- **Symptom:** API routes or ingestion scripts throw `ENCRYPTION_KEY environment variable is required`.
- **Fix:** Generate a 32-byte key (`openssl rand -base64 32`) and set both `ENCRYPTION_KEY` (base64) and `ENCRYPTION_MASTER_KEY` in `.env.local`. Restart the dev server to pick up the change.

### Database connection errors (`ECONNREFUSED` / `No database connection string found`)
- **Cause:** `LOCAL_DATABASE_URL` or `DATABASE_URL` is missing/incorrect. `src/lib/database.ts` requires a valid URL.
- **Fix:** Populate `.env.local` with either `LOCAL_DATABASE_URL` (for local Postgres) or `DATABASE_URL` (Neon). Verify the connection string format matches `.env.example`.
- **Tip:** API routes gracefully return `{ keys: [] }` with header `x-db-off: true` when Postgres is down. Use that header to detect DB-off mode in UI tests.

### Clerk renders as unauthenticated during local development
- **Symptom:** Authenticated pages redirect to `/sign-in` even after logging in.
- **Fix:** Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set. `SafeClerkProvider` downgrades gracefully when keys are missing, but protected routes enforced by `src/middleware.ts` still require valid sessions.
- **Fallback:** In fully offline mode, use mock data or run UI in "demo" form without Clerk by commenting out protected routes; remember to restore before committing.

## Ingestion & Usage Data

### `CONFIGURATION_ERROR` telemetry when refreshing usage
- **Cause:** Admin mode keys require `organizationId` and `projectId`. The error is raised from `deriveUsageConfigurationForKey` in `src/lib/usage-fetcher.ts`.
- **Fix:** Update the key via `PUT /api/keys/{id}` (or the dashboard) with normalized IDs (`org-`, `proj_`). Verify `memorybank/activeContext.md` reminders about populating admin headers are satisfied.

### `SCHEMA_MISSING` error from `fetchAndStoreUsageForUser`
- **Symptom:** Refresh fails with a message about daily usage metadata columns.
- **Fix:** Apply migration `drizzle/0003_usage_event_windows.sql` and regenerate snapshots. Re-run `npm test` to confirm ingestion contract tests pass before retrying.

### `usageFetcher security pagination tests failed`
- **Cause:** Modifying pagination logic without updating sanitisation can break `tests/usageFetcherSecurity.test.ts`.
- **Fix:** Ensure `__usageFetcherTestHooks.sanitizeAdminNextPageUrlForTest` still rejects unknown hosts/paths. Update tests and fixtures accordingly.

### Cron endpoint returns `401 Unauthorized`
- **Cause:** Missing or incorrect `CRON_SECRET` header.
- **Fix:** Store the correct secret in the triggering system (Vercel Cron, automation script). Confirm `CRON_SECRET` is not the literal strings `"undefined"` or `"null"`—the handler rejects those.

### Cron returns `503 Service unavailable`
- **Cause:** Environment variable `CRON_SECRET` is unset. The handler explicitly checks for trimmed, non-empty values.
- **Fix:** Set `CRON_SECRET` in the deployment environment (Vercel dashboard) and redeploy.

### Cron succeeds but telemetry shows `simulatedKeys > 0`
- **Cause:** `ENABLE_SIMULATED_USAGE` is enabled or the OpenAI key lacks admin scope.
- **Fix:** Disable `ENABLE_SIMULATED_USAGE` for real runs and validate admin credentials (`scripts/admin-usage-sample.ts`). Review `memorybank/daily_usage_alignment_plan.md` before enabling cron in production.

### Usage analytics page renders empty with logged warning about missing columns
- **Cause:** Metadata columns introduced in migration `0003` are absent. `isMissingColumnError` triggers a legacy fallback.
- **Fix:** Apply latest migrations, rerun ingestion, and refresh the page.

## Scripts & Tooling

### `scripts/usage-backfill.ts` exits with “Unknown argument”
- **Cause:** Flags are strict. Ensure each flag (`--user`, `--days`, `--start`, etc.) includes a value. Run with `--help` for the supported options.

### `usage-telemetry-diff` cannot connect to the database
- **Fix:** Provide a Neon HTTP connection string via `DATABASE_URL` or pass `--skip-db` to compare CSV exports only. Confirm Node 20.18.1 is used (`nvm use`).

### Drizzle migration commands fail with missing connection string
- **Cause:** `drizzle.config.ts` expects `DRIZZLE_DATABASE_URL`, `LOCAL_DATABASE_URL`, or `DATABASE_URL`.
- **Fix:** Export one of those variables before running `npx drizzle-kit ...`. Consider using `direnv` (`.envrc`) to auto-load values.

## Documentation Site

### `npm run docs:build` fails after adding content
- **Common causes:**
  - Missing frontmatter (`id`, `title`, `description`).
  - Invalid Markdown table syntax.
  - Broken relative links.
- **Fix:** Run `npm run docs:build` to see the exact error, then check `docs-site/docs/contributing/documentation.md` for formatting rules. Use `npx markdown-link-check -q -r docs-site/docs` locally to catch link issues early (matches CI behavior).

### Docs dev server port conflict
- **Symptom:** Running `npm run docs` reports that port 3001 is in use.
- **Fix:** Stop the conflicting process or start Docusaurus with `npm run docs -- --port 3002`.

## Testing & CI

### `npm test` fails with Postgres connection errors
- **Cause:** Tests use live DB connections for ingestion contract checks.
- **Fix:** Ensure `LOCAL_DATABASE_URL` points to a running Postgres instance. For purely unit-level work, set `ENABLE_SIMULATED_USAGE=true` and seed minimal data before re-running tests.

### Docs CI fails on `markdown-link-check`
- **Cause:** Recent doc updates introduced dead links.
- **Fix:** Run `npx markdown-link-check -q -r docs-site/docs` locally, update links, or add `.mlcignore` entries if the failure is a known false positive.

### GitHub Pages deployment fails
- **Cause:** The `docs-site/build` artifact was not generated successfully.
- **Fix:** Reproduce locally with `npm run docs:build`, check for build warnings, and ensure static assets (e.g., `/specs/openapi.documented.yml`) exist.

## When to Escalate

- You discover a new inconsistency between code and documentation → log it in `memorybank/context_gaps_log.md`.
- Telemetry indicates data loss or significant variance (>2%) → pause cron (see `docs-site/docs/operations/daily-usage-cron-runbook.md`) and escalate to ingestion owners.
- Confidence in a change drops below 5/10 or risk exceeds 7/10 → follow the Escalation Mode process defined in `AGENTS.md`.

Document new fixes or edge cases here so future contributors can resolve issues faster.
