# Product Context

## Vision
- Deliver a unified dashboard for LLM API usage and cost insights so operators can monitor spend without scraping multiple provider consoles.
- Expand from single-key OpenAI tracking toward organization-wide telemetry using the OpenAI Admin APIs as the next growth stage.

## Target Personas
- **Indie developers / small teams** who need quick visibility into model usage and spend during experiments.
- **Ops / platform engineers** responsible for monitoring organization-level usage once admin mode lands.

## Value Propositions
- Securely store and rotate provider credentials (AES-GCM encrypted at rest, Clerk-authenticated access).
- Automate daily ingestion of usage events with pricing normalization so dashboards stay accurate with minimal setup.
- Surface admin-only resources (projects, memberships, service accounts, certificates) to power compliance and governance workflows.

## Near-Term Objectives (Q4 2025)
1. Validate ingestion accuracy and pricing fallbacks before enabling dashboards for stakeholders (`IngestionTelemetry`).
2. Require `OPENAI_ORGANIZATION` / `OPENAI_PROJECT` configuration prior to cron activation to avoid failed admin syncs.
3. Ship per-key usage mode toggle (standard vs admin) capturing org/project metadata for authenticated requests.

## Success Signals
- At least five beta users connect an API key and see refreshed usage within 24 hours (PRD activation metric).
- Admin mode cron jobs run without configuration errors for two consecutive weeks.
- Security and legal reviews sign off on admin data handling (scheduled 2025-10-01 / 2025-10-02).

## Assumptions & Constraints
- OpenAI remains the sole supported provider during MVP; additional vendors deferred post-launch.
- Cost outputs are labeled as estimates; discrepancies vs provider invoices are acceptable with clear messaging.
- Org-wide admin telemetry is gated behind feature flags until compliance checkpoints complete.
