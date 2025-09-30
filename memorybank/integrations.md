# Integrations Overview

## OpenAI Admin API
- **Entrypoints**: `/v1/organization/usage/completions`, `/v1/organization/projects`, `/v1/organization/projects/{id}/service_accounts`, `/v1/organization/certificates` (+ sub-resources).
- **Env Vars**:
  - `OPENAI_ORGANIZATION` / `OPENAI_PROJECT`
  - `OPENAI_ADMIN_LIMIT` (optional pagination tuning, default 31)
  - `OPENAI_ADMIN_AUDIT_WEBHOOK` (optional security notifications)
  - `ENCRYPTION_KEY` (32-byte base64, reused for service-account key handoff)
- **Secrets Handling**: full admin keys/service-account secrets only in memory during ingestion; persist redacted tokens and AES-GCM metadata only.
- **Access Controls**: ingestion worker (write), analytics UI (read-only view sans key table), SecOps (read for investigations).
- **Monitoring Hooks**: log aggregation to `admin-sync` index, metrics `admin_sync_failures_total`, `admin_cursor_drift_seconds`, `admin_certificate_expiring_total`.
- **Rotation Guidance**: rotate admin key quarterly; service-account keys rotated monthly; webhook secret rotated if audit channel compromised.
- **Compliance Notes**: GDPR export must include project member emails + roles; certificate fingerprints treated as confidential.

## Upcoming Reviews
- 2025-10-01: Security review with Maya & Jamal (`audit/security-review/2025-10-01_security_review_agenda.md`).
- 2025-10-02: Legal consent/DPA brief discussion (`audit/legal-review/2025-10-02_legal_review_brief.md`).
