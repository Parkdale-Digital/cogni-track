2025-09-29 – Step 1 fixtures captured for OpenAI Admin API (usage, projects, memberships, service accounts, keys, certificates).
2025-09-29 – Drafted OpenAI admin schema/migration design doc with FK graph, unique indexes, and review questions.
2025-09-29 – Added admin ingestion spike harness (`spikes/admin_ingestion_spike.ts`) and runbook to validate fixture replay + dedupe logic.
2025-09-29 – Documented OpenAI Admin security controls and integration guardrails (`docs/openai_admin_security_controls.md`, `memorybank/integrations.md`).
2025-09-29 – Refreshed `openai_admin_data_plan.md` with >=8/10 confidence scores, validation hooks, and rollout updates referencing new artefacts.
2025-09-29 – Archived admin ingestion spike report `audit/spike-results/admin_ingestion_spike.json` with summary notes.
2025-09-29 – Scheduled security (2025-10-01) and legal (2025-10-02) reviews; agendas in `/audit/security-review` and `/audit/legal-review`.
2025-09-29 – Authored draft migration `drizzle/0002_openai_admin_tables.sql` plus pre-check instructions (`audit/migration-prechecks.md`).
2025-09-29 – Prep work for spike execution and migration pre-checks documented (checklists in `audit/spike-results/ADMIN_INGESTION_SPIKE_NOTES.md` and `audit/migration-prechecks.md`).
2025-09-30 – Normalized spike harness timestamps to ISO strings (see `spikes/admin_ingestion_spike.ts`) to ensure dedupe collapses bucket + daily events.
2025-09-30 – Executed admin ingestion spike harness (`pnpm exec tsx spikes/admin_ingestion_spike.ts`); logged checksum `aa5edfacf6c747a554b38c85de3fce46f729b85f16940dbc281572b13ef11832` in `audit/spike-results/ADMIN_INGESTION_SPIKE_NOTES.md`.
2025-09-30 – Updated migration pre-check runbook to replace unsupported `drizzle-kit status` with supported commands.
2025-09-30 – Swapped Drizzle pre-check commands to `export` + `check` in `audit/migration-prechecks.md` after CLI verification.
2025-09-30 – Executed migration pre-checks checklist with audit artefacts under audit/migration-prechecks.
2025-09-30 – Elevated migration pre-check evidence with deterministic exports, duplicate spike runs, and checksum verification.
2025-09-30 – Added OpenAI admin tables to Drizzle schema and relations to align with migration draft.
2025-09-30 – Updated src/db/schema.ts with OpenAI admin tables and recorded migration diff parity.
2025-09-30 – Logged ingestion readiness gaps (fixture ID drift, pagination coverage, rate limiting) and captured remediation plan in `memorybank/ingestion_readiness_report.md`.
2025-09-30 – Added multi-page admin usage fixtures (`*_page2.json`) and updated spike harness to validate pagination + foreign key references.
2025-09-30 – Implemented admin usage throttle (`OPENAI_ADMIN_REQUESTS_PER_MINUTE`/`OPENAI_ADMIN_MAX_BURST`) and Retry-After aware fetch logic in `src/lib/usage-fetcher.ts`; updated spike harness + fixtures to cover pagination and FK checks.
2025-10-01 – Exercised admin throttle against mocked server (audit/mock_rate_limit.log) verifying Retry-After handling and burst capping.
2025-10-01 – Added per-day window + metadata columns to `usage_events` (`window_start`, cached token splits, project/key identifiers) and created migration `drizzle/0003_usage_event_windows.sql` updating `usage_admin_bucket_idx` to dedupe on `(key_id, model, window_start)`.
2025-10-01 – Extended `src/lib/usage-fetcher.ts` to populate new `usage_events` metadata: admin/standard fetchers assign `window_start/window_end`, capture OpenAI project/key/tier context, cached token splits, and dedupe on `(keyId, model, windowStart)` before inserts.
2025-10-01 – Converted ingestion dedupe to an upsert (update on existing rows) and tightened `usage_admin_bucket_idx` with a partial index to avoid NULL `window_start`; addressed reviewer feedback about redundant `batch` coalescing.
2025-10-01 – Snapshot regeneration pending; Drizzle tooling requires DATABASE_URL which is not available in sandbox. Documented TODO to rerun `pnpm drizzle-kit generate` in staging.
2025-10-01 – Added feature flag `ENABLE_DAILY_USAGE_WINDOWS`; `fetchAndStoreUsageForUser` now iterates per-day windows, aggregates telemetry (`updatedEvents`, `windowsProcessed`), and upserts each bucket with simulation fallback scoped per window.
2025-10-01 – Responded to PR review threads (window metadata upserts, telemetry increments, migration strategy) and clarified follow-ups; local `npm run build` showed no TypeScript errors post-fix.
