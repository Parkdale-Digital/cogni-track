# OpenAI Admin Data Integration Plan (Confidence ≥8)

## Objectives & Scope
- Persist organization-level telemetry and configuration returned by OpenAI Admin APIs (usage, keys, projects, service accounts, certificates).
- Extend ingestion so Cogni Track reconciles admin data with existing per-user usage events while respecting encryption and privacy constraints.
- Deliver incremental rollouts with measurable validation gates, audit artefacts, and rollback procedures.

## Current Baseline
- `provider_keys` stores encrypted API credentials plus optional encrypted metadata for org/project context.
- `usage_events` ingests per-key usage today; admin fixtures in `audit/admin-api-fixtures/` and ingestion harness (`spikes/admin_ingestion_spike.ts`) validate bucket replay + dedupe semantics.
- Schema snapshots (`drizzle/meta/0001_snapshot.json`) and design documents (`docs/openai_admin_migration_design.md`, `docs/openai_admin_security_controls.md`) outline target tables, security controls, and migration ordering.

## Phased Implementation Plan

### Phase 0 – Foundations & Alignment
1. **Inventory Environment Configuration**
   - *Task*: Finalize env + secrets checklist (`memorybank/integrations.md`) covering `OPENAI_ORGANIZATION`, `OPENAI_PROJECT`, `OPENAI_ADMIN_LIMIT`, `OPENAI_ADMIN_AUDIT_WEBHOOK`, and AES-GCM master key rotation.
   - *Risk*: Missing org/project IDs blocks admin mode; inconsistent env between workers.
   - *Mitigation*: Add config assertion to health check endpoint; link checklist to ops runbook.
   - *Confidence*: 8/10 — Env guardrails documented and cross-referenced with security controls.

2. **Capture Schema Snapshots**
   - *Task*: Export current Drizzle schema + ERD and stash alongside fixtures before authoring migrations.
   - *Risk*: Divergence between local and deployed schema could invalidate migration ordering.
   - *Mitigation*: Use existing snapshot (`drizzle/meta/0001_snapshot.json`) as baseline; rerun `pnpm drizzle-kit introspect` ahead of rollout.
   - *Confidence*: 8/10 — Baseline snapshot verified; tooling already in repo.

### Phase 1 – Data Model Extensions
1. **Define Core Tables**
   - *Task*: Implement tables specified in `docs/openai_admin_migration_design.md` with additive migrations and soft-delete semantics.
   - *Risk*: Large migrations impacting production uptime.
   - *Mitigation*: Ship additive migrations, backfill asynchronously, defer NOT NULL enforcement until data present.
   - *Confidence*: 8/10 — Schema design vetted with fixtures; FK graph + indexes captured.

2. **Pagination Cursor Storage**
   - *Task*: Create `openai_admin_cursors` (endpoint, next_page, version, watermarks) per design doc.
   - *Risk*: Cursor corruption could skip or duplicate data.
   - *Mitigation*: Versioned cursors + spike harness produce deterministic payload for regression tests.
   - *Confidence*: 8/10 — Cursor schema + dedupe strategy validated by spike report.

### Phase 2 – Ingestion Pipeline Enhancements
1. **Refactor Usage Fetcher**
   - *Task*: Split admin vs standard fetch flows, reuse spike dedupe logic, and persist admin buckets with unique index (`usage_admin_bucket_idx`).
   - *Risk*: Duplicate or missing events due to bucket replays.
   - *Mitigation*: Apply dedupe map (timestamp+model) confirmed by `spikes/admin_ingestion_spike.ts`; add UPSERT using unique index.
   - *Confidence*: 8/10 — Spike harness demonstrates expected bucket behaviour and referential checks.

2. **Harvest Org Metadata**
   - *Task*: Build sync jobs for projects, memberships, service accounts, keys, and certificates using captured fixtures.
   - *Risk*: Elevated API quotas or partial sync states.
   - *Mitigation*: Implement backoff + diff logging; leverage relationship diagnostics in spike output to guard referential integrity.
   - *Confidence*: 8/10 — Fixture coverage + diagnostics prove schema relationships; rate-limit plan defined.

3. **Secure Key Material Handling**
   - *Task*: Integrate `encryption.ts` for transient key handling, ensure log sanitizer masks redacted tokens, update unit tests.
   - *Risk*: Accidental plaintext logging.
   - *Mitigation*: Follow controls in `docs/openai_admin_security_controls.md`; add regression tests around sanitizer.
   - *Confidence*: 8/10 — Security controls + integration guardrails documented with owners.

### Phase 3 – Application Layer & Telemetry
1. **Expose Admin Insights**
   - *Task*: Build per-project dashboards and certificate views gated behind admin role checks; source queries from new tables.
   - *Risk*: UI leakage to unauthorized roles.
   - *Mitigation*: Enforce Clerk role guard, add RBAC integration tests, rely on view-level permissions from security doc.
   - *Confidence*: 8/10 — Authorization strategy defined; data model ready for UI consumption.

2. **Augment Audit Logging**
   - *Task*: Emit structured logs per sync with counts, cursor positions, sanitized fields.
   - *Risk*: Log volume spike or missing incident data.
   - *Mitigation*: Use metrics/log plan in security doc; cap retention at 30 days with sampled detail logs.
   - *Confidence*: 8/10 — Logging strategy + metrics enumerated with thresholds.

3. **Monitoring & Alerts**
   - *Task*: Wire metrics (`admin_sync_failures_total`, `admin_cursor_drift_seconds`, `admin_certificate_expiring_total`) into existing observability stack.
   - *Risk*: Alert fatigue if thresholds poorly tuned.
   - *Mitigation*: Start with conservative thresholds; review after week-one; document adjustments in ops runbook.
   - *Confidence*: 8/10 — Metric taxonomy complete; owners identified for tuning.

### Phase 4 – Rollout & Hardening
1. **Staging Validation**
   - *Task*: Run full sync in non-prod with anonymized admin key, compare row counts vs fixtures + live responses.
   - *Risk*: Staging data stale, reducing confidence.
   - *Mitigation*: Use anonymized key with limited scope; replay fixtures first to confirm pipeline before live hit.
   - *Confidence*: 8/10 — Spike harness + fixtures provide baseline diff pipeline; only credential provisioning outstanding.

2. **Incremental Production Enablement**
   - *Task*: Enable admin mode behind org-level feature flag; monitor telemetry; auto-disable on failure thresholds.
   - *Risk*: Unexpected load or billing anomalies.
   - *Mitigation*: Use feature flags + alerting; maintain rollback scripts; stage rollout by cohort.
   - *Confidence*: 8/10 — Feature flag + alert framework already in place; telemetry plan defined.

3. **Documentation & Training**
   - *Task*: Update runbooks, record dashboard walkthrough, capture known limitations.
   - *Risk*: Knowledge gaps during on-call handoffs.
   - *Mitigation*: Follow documentation cadence; leverage `audit/spike-results/README.md` + security notes for training material.
   - *Confidence*: 8/10 — Documentation pipeline established; artefacts ready for inclusion.

## Validation Pipeline
1. Unit + integration tests covering new tables, dedupe helpers, sanitizer logic.
2. Replay fixtures via `pnpm exec tsx spikes/admin_ingestion_spike.ts` to verify ingestion output + relationship diagnostics.
3. Dry-run admin sync (read-only) comparing counts against fixtures before enabling mutations.
4. Standard lint (`pnpm lint`), type-check (`pnpm tsc --noEmit`), e2e smoke tests.
5. Manual dashboard verification + RBAC checks post-rollout.

## Rollback Strategy
1. Disable admin feature flag → stop admin sync jobs; revert to standard usage mode.
2. Roll back migrations via Drizzle snapshots or restore DB backup; truncate new tables if partial data persists (log actions in `rollback_log.md`).
3. Reset `openai_admin_cursors` and rerun standard ingestion validation.
4. Notify SecOps via audit webhook; document outcome in `/audit/rollback_log.md`.

## Open Questions / Follow-ups
- Confirm with Legal whether service-account metadata falls under existing DPAs (owners: Maya + Legal by 2025-10-02).
- Align on long-term retention window for certificate events (SecOps decision pending).
- Determine if additional per-project consent is required before enabling admin telemetry for customer workspaces.
