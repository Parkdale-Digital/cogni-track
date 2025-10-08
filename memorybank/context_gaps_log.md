# Context Gaps Log

## GAP-2025-10-07-DAILY-USAGE-PARITY
- **Discovered:** 2025-10-07
- **Owner:** Daily Usage Alignment Crew (primary: Shawn)
- **Summary:** Telemetry diff (`scripts/usage-telemetry-diff.ts`) continues to report 46 missing daily windows for project `proj_MhIbP1DyoTSqH6k2DtXVKvvV` (keys `key_mPAw5OyZbONR4dAL`, `key_NF7ZLeXYAXECwqv7`) despite ingestion refactors.
- **Impact:** Prevents confidence from exceeding 6/10 for daily usage parity; dashboards risk under-reporting daily totals for affected project.
- **Evidence:**
  - `audit/telemetry-audit/2025-10-07T22-44-28Z-staging.json`
  - `audit/telemetry-audit/missing-windows-summary-2025-10-07.md`
  - `audit/telemetry-audit/latest-staging.json` (2025-10-08 rerun)
  - `audit/backfill-rehearsal/2025-10-08-staging-repair.log`
  - `audit/backfill-rehearsal/2025-10-08-staging-groupby-v2.log`
- **Next Validation Checkpoint:** After staging migration `0003_usage_event_windows.sql` is applied and filtered diff rerun with persistence counters (target date: 2025-10-10).
- **Status:** Active

## Review Cadence
- **Quarterly Sweep:** Cross-check `memorybank/progress.md` against `/audit` artefacts on the first business day of each quarter; log outcome in `memory_bank_review_log.md`.
