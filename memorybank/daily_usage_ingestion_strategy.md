# Daily Usage Ingestion Strategy Draft

## Goals
- Maintain a rolling 30-day window of OpenAI completions data with day-level granularity.
- Avoid gaps by running automated refresh jobs instead of manual button presses.
- Support historical backfill when feature is enabled.

## Proposed Flow
1. **Daily Scheduler**
   - Add a cron-triggered job (e.g., `/app/api/cron/usage`) that runs every night at 01:00 UTC.
   - Job iterates over all OpenAI provider keys for active users.
   - For each key, call `fetchAndStoreUsageForUser(userId, 2)` to cover yesterday + today overlap.
   - Track per-user/per-key cursors to avoid redundant calls when ingestion is healthy.

2. **Backfill Routine**
   - Introduce server action or CLI `pnpm usage:backfill --days=30 --user=<id>`.
   - Loop downward from `now - days` to `now`, invoking a `fetchOpenAIDay` helper to ingest one day at a time.
   - Continue using unique indexes to dedupe; log processed vs skipped counts per day.

3. **Per-Day Helper**
   - Extract logic from `fetchOpenAIUsage` so it accepts `(start, end)` window.
   - Admin mode: call `/v1/organization/usage/completions?start_time=<start>&end_time=<end>`.
   - Standard mode: same for `/v1/usage` (if API supports `end_time` per-day) otherwise post-filter results.
   - Store canonical `window_start`/`window_end` columns for dedupe + reporting.

4. **Telemetry**
   - Emit structured logs: `{ userId, keyId, windowStart, storedEvents, skippedEvents, issues }`.
   - Publish metrics for job duration, API errors, and eventual parity check results.

## Scheduling Details
- **Backoff**: Implement token bucket (already in admin throttle) to stagger daily requests.
- **Retries**: Use existing `retryFetch` but expand to respect `Retry-After` for 429s.
- **Idempotency**: Combination of `(keyId, window_start, model)` unique key ensures safe replays.
- **Retention**: Keep only latest 90 days in DB? (TBD) For now, plan on 30-day rolling window to mirror OpenAI dashboard defaults.

## Open Questions
- Do we store cursor per user or per key? (per key recommended due to org admin mode sharing projects.)
- Should cron job run per user in parallel? Need rate-limit plan before implementation.
- How to authenticate cron trigger in production (e.g., Vercel cron secret header).

