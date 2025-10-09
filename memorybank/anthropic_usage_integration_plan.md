# Anthropic Usage API Integration Plan
_Last updated: 2025-10-09_

## Summary
- Integrate Anthropic's Usage & Cost Admin API into the existing usage ingestion pipeline alongside OpenAI.
- Preserve auditability, dedupe guarantees, and accessibility-focused analytics UX.
- Deliver toggleable rollout guarded by feature flags and backed by documented runbooks.

## Success Criteria
- Anthropic usage and cost data ingested into `usage_events` (or successor tables) with provider metadata and parity telemetry.
- Cron/backfill processes handle Anthropic provider without impacting OpenAI ingestion SLAs.
- Analytics dashboards allow filtering/aggregation by provider and display Anthropic metrics without regressions in accessibility or visual tokens.
- Audit artefacts (telemetry diffs, runbooks, rollback instructions) documented under `/audit` and memory bank updated.

## Preconditions & Dependencies
- Admin Anthropic API key issued with Usage & Cost API entitlements.
- `anthropic-version` header value confirmed (currently `2023-06-01` per docs).
- Network egress to `https://api.anthropic.com`.
- Feature flag strategy agreed (e.g., `ENABLE_ANTHROPIC_USAGE`).
- GAP-2025-10-09-ANTHROPIC-DOCS resolved (✅ 2025-10-09).

## Implementation Steps

### 1. Confirm Anthropic Usage API Reference *(Completed 2025-10-09)*
- **Tasks**
  - Retrieve official Usage & Cost API specification via Context7 `/llmstxt/anthropic_llms_txt`.
  - Capture endpoints `/v1/organizations/usage_report/messages`, `/v1/organizations/cost_report`, `/v1/usage`, required headers, and parameter semantics.
  - Store findings in memory bank and audit-ready notes.
- **Risks (3/10)**: Documentation drift or missing beta flags.  
  - *Mitigation*: Cross-verify with latest release notes and request vendor confirmation during integration review.
- **Confidence (8/10)**: Primary docs secured; minor uncertainty around future revisions.
- **Validation**: Docs archived; knowledge entry stored (2025-10-09).
- **Rollback**: N/A (read-only step).

### 2. Audit Existing Usage Ingestion Foundations
- **Tasks**
  - Inspect `src/lib/usage-fetcher.ts`, cron routes, Drizzle schema, and telemetry pipelines to map provider-dependent logic.
  - Inventory assumptions (naming, enums, index constraints) tied to OpenAI-only flows.
  - Update audit notes with Anthropic deltas (e.g., field mappings, rate limit expectations).
- **Risks (5/10)**: Overlooking implicit OpenAI-only constraints leading to ingestion bugs.  
  - *Mitigation*: Trace end-to-end (fetch → normalize → persist → analytics) and document mismatches before coding.
- **Confidence (7/10)**: Codebase well-understood, but requires careful review for hidden coupling.
- **Validation**: Annotated diagrams/checklist documenting flow; peer skim before implementation.
- **Rollback**: If new findings contradict assumptions, pause and update plan; no code changes yet.

### 3. Design Configuration & Schema Extensions
- **Tasks**
  - Define env vars (`ANTHROPIC_ADMIN_API_KEY`, `ANTHROPIC_USAGE_BASE_URL`, rate limit knobs).
  - Map Anthropic usage payloads to existing tables; determine if new columns or tables are required.
  - Draft migration strategy (including feature flag/backfill order) and update docs (`docs/`, `memorybank/`).
- **Risks (6/10)**: Schema misalignment could break dedupe or analytics queries.  
  - *Mitigation*: Prototype mapping against sample JSON, run migration impact assessment, align with data stakeholders.
- **Confidence (6/10)**: Payload understanding solid; storage fit requires validation.
- **Validation**: Schema diff review, dry-run migrations in staging sandbox, confirm indexes handle provider dimension.
- **Rollback**: Revert draft migrations, remove env defaults, document outcomes in `rollback_log.md`.

### 4. Implement Anthropic Fetcher Module
- **Tasks**
  - Create dedicated fetcher with auth headers, pagination, throttling, and retry logic mirroring OpenAI implementation.
  - Support bucket width, grouping, and filter parameters; normalize token fields (cached, uncached, output, server tool).
  - Emit structured telemetry (latency, rate-limit hits, response anomalies).
- **Risks (6/10)**: Unhandled rate-limit semantics or payload variance causing ingestion stalls.  
  - *Mitigation*: Adopt Retry-After aware logic, configurable ceilings, and feature-flagged dry-run mode.
- **Confidence (6/10)**: Patterns reusable but real responses untested.
- **Validation**: Unit tests against fixtures, dry-run fetch with synthetic environment, log inspection.
- **Rollback**: Remove new fetcher module, disable flag, revert config; ensure cron skips provider gracefully.

### 5. Persist & Schedule Anthropic Usage
- **Tasks**
  - Integrate fetcher into ingestion coordinator, ensuring provider-aware normalization and dedupe.
  - Update cron/backfill scripts to iterate providers, track telemetry per provider, and guard with feature flag.
  - Ensure DB writes include provider metadata for analytics alignment.
- **Risks (7/10)**: Mixed-provider dedupe or telemetry errors causing data corruption.  
  - *Mitigation*: Provider-aware upsert keys, staging dry-run with fixtures, double-entry logging before prod enablement.
- **Confidence (5/10)**: Integration complexity higher; requires careful testing.
- **Validation**: Staging dry-run, telemetry diff (Anthropic-only fixtures), integrity checks on `usage_events`.
- **Rollback**: Toggle flag off, purge Anthropic rows via timestamp/provider filters, verify OpenAI ingestion unaffected.

### 6. Expand Analytics & UI Coverage
- **Tasks**
  - Extend aggregation services and UI filters to include `provider` dimension (Anthropic vs OpenAI).
  - Update charts, summaries, and exports to handle Anthropic data while preserving accessibility tokens.
  - Add analytics tests/snapshots for multi-provider scenarios.
- **Risks (6/10)**: UI regressions or misleading combined metrics.  
  - *Mitigation*: Feature-gate UI changes, conduct accessibility/visual regression pass, validate with sample datasets.
- **Confidence (6/10)**: Existing UI patterns guide implementation but require QA.
- **Validation**: Manual a11y sweep, light/dark visual checks, Jest/Playwright snapshots if available.
- **Rollback**: Revert UI changes, disable provider toggle, confirm dashboards render original data.

### 7. Validation, Monitoring & Rollout
- **Tasks**
  - Execute validation pipeline (see below) including dry-run ingestion, staging diff, telemetry audits.
  - Define alert thresholds for Anthropic ingestion (rate-limit spikes, missing buckets).
  - Plan phased rollout: internal testing → staged enablement → full deployment.
- **Risks (5/10)**: Undetected data drift slipping into production.  
  - *Mitigation*: Expand telemetry dashboards, schedule post-rollout audits, keep rollout reversible with flags.
- **Confidence (6/10)**: Validation framework exists; new provider adds moderate complexity.
- **Validation**: Completed pipeline run with documented artefacts; sign-off from analytics stakeholders.
- **Rollback**: Disable feature flag, clear Anthropic caches/queues, restore baseline telemetry thresholds.

### 8. Documentation & Operationalization
- **Tasks**
  - Update `/docs`, `/audit`, and memory bank entries (progress, active context, runbooks).
  - Record final plan execution summary and outstanding follow-ups.
  - Ensure on-call/operations have clear playbooks for Anthropic ingestion issues.
- **Risks (4/10)**: Knowledge gaps hinder long-term maintenance.  
  - *Mitigation*: Tie documentation to definition-of-done, schedule periodic review (memory bank Tier 1 log).
- **Confidence (8/10)**: Documentation process well established.
- **Validation**: Completed doc updates, memory bank review entries, audit artefacts.
- **Rollback**: N/A (documentation step).

## Validation Pipeline (Cross-Step)
1. **Pre-check**: Re-read Anthropic Usage & Cost API spec, confirm env vars set safely (no dev/build scripts run).  
2. **Simulation**: Dry-run ingestion using fixtures/sandbox, with feature flag off for production.  
3. **Static Checks**: `pnpm lint`, `pnpm typecheck` (ensure no `npm run dev/build` without user approval).  
4. **Integration Tests**: Staging ingestion with telemetry diff comparisons and audit artefacts.  
5. **Manual Review**: Analytics/product review of dashboards; security sign-off for new credentials.

## Rollback Protocol (High-Level)
1. Disable Anthropic feature flag and halt scheduler jobs for the provider.  
2. Revert migrations/config (if necessary) or execute rollback scripts documented per step.  
3. Purge Anthropic-specific data inserts if corruption detected, leveraging provider/timestamp filters.  
4. Validate rollback via telemetry, diff scripts, and manual dashboard checks.  
5. Log rollback actions in `rollback_log.md` with timestamps and confirmations.

