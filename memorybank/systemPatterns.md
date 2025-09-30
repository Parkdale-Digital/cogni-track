# System Patterns

## Architecture Overview
- Next.js application hosted on Vercel with Clerk-protected `/app` and `/api` routes.
- Neon Postgres serves as the primary data store queried through Drizzle ORM.
- Background jobs run via Vercel Cron or Inngest to execute ingestion workflows.

## Data Ingestion Flow
1. Scheduler triggers ingestion worker with feature-flagged access to admin mode.
2. Worker decrypts provider keys using AES-GCM helpers in `src/lib/encryption.ts` and resolves per-key usage mode.
3. Standard mode hits `https://api.openai.com/v1/usage`; admin mode calls `https://api.openai.com/v1/organization/usage/completions` with `OpenAI-Organization` and `OpenAI-Project` headers.
4. Responses normalize into `UsageEventData` records, applying pricing fallbacks and dedupe guarded by the `usage_admin_bucket_idx` unique index.
5. Admin fixtures replay (`spikes/admin_ingestion_spike.ts`) verify deterministic output before cron enablement.

## Admin Data Surfaces
- Dedicated tables (`openai_projects`, `openai_project_members`, `openai_service_accounts`, `openai_service_account_keys`, `openai_certificates`, `openai_certificate_events`, `openai_admin_cursors`) capture organization metadata with soft-delete semantics.
- Cursors table tracks `next_page`, window bounds, and error counts per endpoint to recover from sync interruptions.
- Service account keys persist only redacted values; full secrets live in memory during ingestion.

## Security Controls
- Provider keys and metadata use AES-GCM encryption (key + IV + auth tag columns) to enforce confidentiality at rest.
- Usage configuration validation throws when admin mode is missing organization or project identifiers, preventing bad requests.
- Security review artefacts (`docs/openai_admin_security_controls.md`) define RBAC: ingestion worker write access, analytics read-only views, SecOps investigative rights.

## Observability & Alerting
- `IngestionTelemetry` tracks processed, simulated, and failed keys along with warning codes surfaced in the UI.
- Planned metrics: `admin_sync_failures_total`, `admin_cursor_drift_seconds`, `admin_certificate_expiring_total` exported to monitoring stack per integrations runbook.
- Structured logs scrub sensitive fields (redacted tokens, fingerprints) before shipping to centralized logging.

## Pending Enhancements
- Build sync jobs for admin side endpoints beyond usage (projects, memberships, service accounts, certificates) prior to production rollout.
- Document rollback paths in `rollback_log.md` once migrations promoting admin tables graduate from draft to applied state.
