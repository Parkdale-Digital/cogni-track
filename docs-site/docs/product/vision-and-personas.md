---
title: Vision & Personas
description: Product vision, target users, and value propositions for the LLM usage tracking platform
sidebar_position: 2
---

## Overview

CogniTrack delivers unified visibility into large language model usage and cost
so operators can replace manual console checks with a single dashboard. This
page distills the enduring vision, personas, and value exchange that shape the
roadmap.

## Product Vision

CogniTrack provides a centralized telemetry layer for LLM consumption. The
platform evolves from single-key OpenAI tracking toward organization-wide
observability by integrating provider admin APIs and normalizing pricing data.
Long term, CogniTrack becomes the system of record for model usage governance,
powering compliance, budgeting, and optimization workflows.

## Target Personas

### Experimenting Builders

Indie developers and small product teams need fast feedback on usage and spend
while iterating on prototypes. They value low-friction setup, clear credit burn
rates, and alerts when experiments exceed expectations.

### Platform & Operations Engineers

Platform owners monitor organization-level usage once admin capabilities are
enabled. They require governance controls, reliable automation, and dashboards
that summarize health across keys, projects, and service tiers without exposing
sensitive credentials.

## Value Propositions

- **Secure credential lifecycle**: Provider keys are encrypted at rest with
  AES-GCM and accessed through Clerk-authenticated workflows, allowing teams to
  delegate ingestion safely.
- **Automated ingestion & normalization**: Scheduled jobs fetch provider usage,
  dedupe events, and apply consistent pricing so stakeholders trust dashboard
  metrics.
- **Admin telemetry surfaces**: Organization metadata (projects, memberships,
  service accounts, certificates) becomes queryable, enabling compliance and
  access reviews.
- **Feature-flagged rollout**: Admin capabilities ship behind toggles, letting
  operations teams pilot changes while maintaining guardrails for production
  traffic.

## Roadmap Themes

- Expand multi-provider support through a shared ingestion interface while
  maintaining reliability for OpenAI consumers.
- Deepen telemetry with environment metadata (service tier, project
  identifiers, run labels) to enrich analytics and alerting capabilities.
- Harden self-service setup with configuration validation, fixture-driven
  testing, and rollback playbooks that keep ingestion safe to enable.

## Related Documentation

- [Product Requirements](./prd.md)
- [Anthropic Integration Roadmap](./anthropic-integration-roadmap.md)
- [Usage Ingestion Pipeline](../architecture/usage-ingestion-pipeline.md)
