---
title: Beta Readiness Tracker
description: Key performance indicators and launch readiness criteria for beta release
sidebar_position: 4
---

## Overview

This tracker outlines the enduring criteria required to open CogniTrack's beta
program. It consolidates ingestion reliability, configuration safeguards,
security checks, and telemetry coverage so the Documentation Working Group can
report on launch posture without referencing time-bound plans.

## Launch Criteria

### Ingestion Reliability

- Daily cron jobs ingest usage data without missing windows and store
  normalized pricing across provider modes.
- Backfill tooling can replay historical windows using the documented CLI
  workflow while maintaining dedupe guarantees.
- Parity diffs between staged and expected data sets report zero missing or
  mismatched windows.

### Configuration Assurance

- Admin mode requires organization and project identifiers before ingestion
  runs, preventing misconfigured cron jobs.
- Environment validation surfaces actionable errors in the dashboard and API
  responses when required settings are absent.
- Credentials are encrypted with AES-GCM and rotated through
  Clerk-secured workflows.

### Security & Compliance

- Security controls for admin data handling are approved, including RBAC
  assignments and audit logging coverage.
- Rollback plans and runbooks exist for migrations, cron enablement, and feature
  flag toggles.
- Access to provider metadata tables is restricted to authorized roles, with
  automated alerts for unexpected access patterns.

### Experience Readiness

- Analytics dashboards expose new metadata dimensions (projects, service tiers,
  run labels) with accessible interactions.
- Exports and API endpoints return the same enriched fields surfaced in the UI.
- Operators can monitor ingestion health via `IngestionTelemetry`, scripted
  summaries, and standardized audit artefacts.

## Metrics & Evidence

- `IngestionTelemetry` alerts and success rates confirm daily jobs complete
  without retries exceeding documented thresholds. See
  [Telemetry & Observability](../architecture/telemetry-and-observability.md)
  for metric definitions.
- Golden fixture comparisons validate dedupe, pricing fallbacks, and cached
  token handling before production enablement.
- Monthly cost reconciliations compare normalized totals against provider
  invoices, maintaining variance within the defined tolerance.

## Outstanding Workstreams

- Complete the 48-hour cron rehearsal with monitoring artefacts logged under
  `audit/cron-dry-run/`.
- Finalize contract tests covering dedupe invariants, cached token splits, and
  pricing fallback behavior.
- Document compliance sign-off and RBAC mapping in the security controls
  reference.

## Related Documentation

- [Vision & Personas](./vision-and-personas.md)
- [Telemetry & Observability](../architecture/telemetry-and-observability.md)
- [Environment Configuration](../architecture/environment-configuration.md)
