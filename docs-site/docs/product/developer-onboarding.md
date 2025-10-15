---
id: developer-onboarding
title: Developer Onboarding Guide
description: Quick-start guide for engineers joining the CogniTrack codebase.
sidebar_position: 1.5
---

CogniTrack pairs a Next.js application with automated ingestion workers and a Docusaurus knowledge base so internal teams can track LLM usage and spend from a single workspace. Use this guide to get productive quickly, understand the repo layout, and know which docs to read next.

## At a Glance

- **Platform goal:** Centralize usage visibility, telemetry, and alerts for OpenAI (and future providers) so engineering and finance partners can reconcile spend.
- **Primary users:** Internal engineers, ingestion operators, and documentation contributors.
- **Core stack:** Next.js 15, TypeScript, Tailwind CSS, Clerk, Drizzle ORM, Postgres (Neon), Vercel Functions/Cron, Docusaurus 3.

For a deeper architectural breakdown, see the [System Map](../architecture/system-map.md).

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/` | Next.js application (routes, UI components, server actions, API handlers, middleware). |
| `src/lib/` | Shared libraries for database access, encryption, ingestion orchestration, and utilities. |
| `src/db/` | Drizzle schema definitions that mirror the migrations under `drizzle/`. |
| `src/components/` | UI primitives and analytics dashboards (usage charts, filters, exports). |
| `src/app/api/` | Route handlers for provider key management, on-demand usage ingestion, and scheduled jobs. |
| `scripts/` | Operational tooling (usage backfill, telemetry diffing, fixture sanitization). |
| `tests/` | Contract, security, and UI-adjacent test suites executed through `npm test`. |
| `docs-site/` | Docusaurus docs workspace (product, architecture, operations, contributing). |
| `memorybank/` | Living context: progress logs, integration plans, gap tracking. |
| `audit/` | Evidence from rehearsals, telemetry diffs, and compliance checklists. |

## Prerequisites

| Requirement | Notes |
| --- | --- |
| Node.js 20.18.1 | Run `nvm use` (reads `.nvmrc`). |
| npm 10.x | Ships with Node 20. |
| Postgres access | Use `LOCAL_DATABASE_URL` for local development or `DATABASE_URL` for Neon. |
| direnv (optional) | Loads `.env.local` automatically (see `.envrc`). |

## Setup Steps

```bash
# 1. Install dependencies
npm install
npm install --prefix docs-site

# 2. Configure environment variables
cp .env.example .env.local
# Populate DATABASE_URL / LOCAL_DATABASE_URL, Clerk keys, encryption keys, CRON_SECRET, OpenAI settings.

# 3. Run the application and docs
npm run dev        # Next.js app on http://localhost:5000
npm run docs       # Docusaurus on http://localhost:3001
```

> The dev server uses port **5000** (see the root `package.json`). Update the script if you need a different port.

## Validation Checklist

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint (Next.js core-web-vitals) across the app. |
| `npm test` | Aggregated ingestion, security, and component tests. |
| `npm run build` | Ensures the Next.js production build succeeds. |
| `npm run docs:build` | Verifies Docusaurus compiles without link errors. |

When ingestion logic changes, run `npm test` and consider executing `scripts/usage-telemetry-diff.ts` with current exports to confirm parity.

## Operational Utilities

- `npm run usage:backfill` &mdash; Replays historical usage windows with telemetry logging.
- `scripts/usage-telemetry-diff.ts` &mdash; Compares ingested data against provider CSV exports.
- `scripts/admin-usage-sample.ts` &mdash; Validates OpenAI Admin API credentials.

Archive evidence from dry runs under `audit/` and capture context updates in `memorybank/progress.md`.

## Where to Go Next

- [System Map](../architecture/system-map.md) for runtime diagrams and data flows.
- [Developer Workflow](../contributing/developer-workflow.md) for branching, testing, and review expectations.
- [Troubleshooting](../operations/troubleshooting.md) for common setup and ingestion issues.
- [Usage Ingestion Pipeline](../architecture/usage-ingestion-pipeline.md) to understand automated data collection.

Keeping docs and code in sync is part of the Definition of Done—update this page whenever onboarding assumptions change.
