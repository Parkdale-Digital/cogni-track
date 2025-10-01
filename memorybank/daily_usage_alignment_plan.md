# Daily Usage Alignment Plan

## Objective
Match Cogni Track's daily usage analytics to the granularity and totals shown in the OpenAI dashboard, covering the full 30-day window with per-day accuracy.

## Workstreams

### 1. Telemetry Audit
- **Action**: Diff `usage_events` schema and sample rows against the latest OpenAI completions CSV exports to catalogue missing fields (project, key, service tier, cached tokens, etc.).
- **Risks**: CSV schema drift or overlooked columns.
- **Mitigation**: Script the diff, gather multiple exports (different projects/tiers), document findings in repo wiki.
- **Confidence**: 6/10 after cross-checking exports and updating documentation.

### 2. Ingestion Window & Scheduling
- **Action**: Design cron/backfill workflow that requests up to 30 days of data and prevents future gaps via daily pulls.
- **Risks**: API throttling, duplicate buckets.
- **Mitigation**: Leverage existing unique indexes, add ingestion telemetry (processed/failed counts), implement rate limiting.
- **Confidence**: 5/10 increasing to 7/10 once dry-run completes in sandbox with telemetry review.

### 3. Per-Day Fetch Loop & Metadata Capture
- **Action**: Refactor `fetchOpenAIUsage` to iterate day-by-day, persisting midnight UTC buckets along with metadata (project_id, num_model_requests, service tier, cached token splits, api_key_id).
- **Risks**: Large payload parsing, schema drift, feature flag rollout.
- **Mitigation**: Add contract tests using recorded OpenAI responses, guard JSON parsing, deploy behind feature flag with monitoring.
- **Confidence**: 4/10 baseline → 7/10 after contract tests and staged rollout succeed.

### 4. Schema & API Extensions
- **Action**: Add columns/migrations for new metadata, expose through `/api/usage`, ensure backward compatibility.
- **Risks**: Migration downtime, inconsistent environments.
- **Mitigation**: Ship additive migrations, backfill asynchronously, test in staging copy, keep rollback SQL ready.
- **Confidence**: 5/10 → 8/10 post-staging validation and load test.

### 5. Analytics UI & Export Updates
- **Action**: Update charts/tables to plot daily buckets, add filters (project/key/tier), paginate exports, memoize transforms.
- **Risks**: Performance regressions, UX mismatch.
- **Mitigation**: Add unit/interaction tests, run Storybook snapshots, get UX sign-off.
- **Confidence**: 6/10 → 8/10 after performance profiling and review.

### 6. Parity Validation Pipeline
- **Action**: Build automated diff comparing Cogni Track API totals against OpenAI CSV totals per day; normalize timestamps to UTC and alert on variance.
- **Risks**: Timezone errors, alert fatigue.
- **Mitigation**: Document UTC contract, set conservative alert thresholds, add regression fixtures.
- **Confidence**: 6/10 → 8/10 after regression tests and scheduled parity job run clean.

## Confidence Boosters (Cross-Cutting)
- Staging environment seeded with anonymized CSV data for repeatable verification.
- Ingestion telemetry dashboards (events ingested, skipped, pricing fallback usage) with alerting.
- Peer review + QA sign-off before enabling feature flag in production.
- Rollback checklist covering feature flag disable, migration revert, and cursor reset.

## Validation & Rollback Summary
- **Validation**: Unit + contract tests, migration dry runs, parity diff job, manual QA against OpenAI dashboard.
- **Rollback**: Disable feature flag, revert migrations/DB snapshot, truncate new columns if required, document in `audit/rollback_log.md`.

