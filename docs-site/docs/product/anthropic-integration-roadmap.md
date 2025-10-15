---
title: Anthropic Integration Roadmap
description: Multi-provider strategy and Anthropic API integration plans
sidebar_position: 3
---

## Overview

CogniTrack is extending its ingestion pipeline to support Anthropic's Usage &
Cost Admin API alongside existing OpenAI coverage. This roadmap summarizes the
multi-provider strategy, delivery phases, and risk management practices that
prepare the product for broader provider adoption.

## Multi-Provider Strategy

The ingestion layer is evolving into a provider abstraction that standardizes
how usage events are fetched, normalized, deduplicated, and priced. Anthropic
joins OpenAI behind a shared interface responsible for:

- **Unified schema**: Normalized events capture provider identifiers,
  organization metadata, and pricing data in a consistent shape for analytics.
- **Deterministic dedupe**: Provider-specific event identifiers roll into a
  composite key so backfills and retries stay idempotent.
- **Cost parity**: Provider pricing feeds normalize token types and SKUs before
  dashboards surface totals.

For technical details on the ingestion flow, see the
[Usage Ingestion Pipeline](../architecture/usage-ingestion-pipeline.md).

## Delivery Phases

1. **Foundation**: Land the provider interface, registry, and feature flags that
   control Anthropic ingestion separately from OpenAI.
2. **Schema Upgrade**: Extend database tables with provider metadata, apply
   migrations, and backfill historical records without disrupting existing
   dashboards.
3. **Ingestion Enablement**: Implement Anthropic fetchers, normalization, and
   dedupe checkpoints with fixture-driven tests and parity diffs.
4. **Analytics Parity**: Update dashboards, exports, and API responses to
   support provider filtering while verifying accessibility and visual
   consistency.
5. **Rollout & Monitoring**: Activate Anthropic ingestion behind staged flags,
   monitor telemetry alerts, and document rollback protocols.

## Dependencies & Controls

- **Credentials & Access**: Anthropic admin API keys must be managed with the
  same AES-GCM encryption and Clerk-gated workflows used for OpenAI
  credentials.
- **Feature Flags**: Rollout depends on granular flags (global, organization,
  user) to pilot ingestion safely.
- **Testing**: Golden fixtures, contract tests, and telemetry diffs verify
  parity before enabling cron jobs.
- **Operational Runbooks**: Audit logs capture rehearsals, parity checks, and
  rollback steps for repeatable operations.

## Risks & Mitigations

- **Schema regressions**: Migrations introduce new provider columns; mitigate by
  rehearsing on staging and archiving snapshots in
  `audit/migration-prechecks/`.
- **Cost variance**: Normalization gaps could skew totals; mitigate with monthly
  reconciliations comparing ingested costs to provider invoices.
- **API drift**: Anthropic endpoints may evolve; mitigate by version-pinning,
  monitoring release notes, and refreshing fixtures at least quarterly.

## Related Documentation

- [Vision & Personas](./vision-and-personas.md)
- [Usage Ingestion Pipeline](../architecture/usage-ingestion-pipeline.md)
- [Telemetry & Observability](../architecture/telemetry-and-observability.md)
