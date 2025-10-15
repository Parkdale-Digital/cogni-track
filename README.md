# CogniTrack

CogniTrack is an internal platform for tracking Large Language Model (LLM) API consumption. It combines a Next.js application for key management, analytics, and exports with a Docusaurus workspace that documents product decisions, architecture, and operational playbooks.

## At a Glance

- **What it solves:** Gives engineering and finance partners a centralized dashboard to monitor spend, token trends, and operational telemetry for OpenAI integrations.
- **Who uses it:** Internal developers enabling usage visibility, operators running ingestion jobs, and documentation contributors evolving the knowledge base.
- **Core technologies:** Next.js 15, TypeScript, Tailwind CSS, Clerk, Drizzle ORM, Postgres (Neon), Vercel Functions/Cron, Docusaurus 3.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for a deeper system tour and [`API_REFERENCE.md`](API_REFERENCE.md) for endpoint details.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `src/` | Next.js application (routing, UI, server actions, API routes, middleware). |
| `src/lib/` | Shared libraries for database access, encryption, ingestion, and utilities. |
| `src/db/` | Drizzle schema definitions and helpers. |
| `src/components/` | React UI, analytics dashboards, and form logic. |
| `src/app/api/` | Route handlers for provider keys, usage ingestion, and scheduled jobs. |
| `drizzle/` | SQL migrations, generated schema snapshots, and metadata. |
| `tests/` | Contract, security, and UI-adjacent test suites executed via `npm test`. |
| `scripts/` | Operational tooling (usage backfill, telemetry diffing, fixture sanitization). |
| `docs-site/` | Docusaurus site housing product, architecture, and operations docs. |
| `memorybank/` | Living design history, context, and integration plans that inform ongoing work. |
| `audit/` | Evidence from rehearsals, telemetry audits, and compliance checklists. |

## Getting Started

### Prerequisites

- Node.js **20.18.1** (`nvm use` will read [`.nvmrc`](.nvmrc))
- npm 10.x (ships with Node 20) or later
- Local Postgres (optional; set `LOCAL_DATABASE_URL` when using a self-hosted database)
- direnv (optional) for automatically loading `.env.local`

### 1. Clone & Install

```bash
npm install
npm install --prefix docs-site
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in the values that match your environment:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon in production). |
| `LOCAL_DATABASE_URL` | Local Postgres URL used when `NODE_ENV !== "production"`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk authentication keys. |
| `ENCRYPTION_MASTER_KEY` / `ENCRYPTION_KEY` | AES-256-GCM secrets for provider key storage. |
| `CRON_SECRET` | Bearer token required to access `/api/cron/daily-usage`. |
| `OPENAI_API_KEY` and admin headers (`OPENAI_ORGANIZATION`, `OPENAI_PROJECT`) | Required for ingestion in admin mode. |
| `OPENAI_USAGE_MODE` | Defaults to `standard`; toggle to `admin` for org-wide ingestion. |
| `ENABLE_*` flags | Feature toggles controlling ingestion behavior (see [`ARCHITECTURE.md`](ARCHITECTURE.md#configuration--feature-flags)). |

Refer to the Docusaurus [Environment Configuration guide](docs-site/docs/architecture/environment-configuration.md) before promoting changes between environments.

### 3. Run the Apps

```bash
# Next.js application (http://localhost:5000)
npm run dev

# Docusaurus docs (http://localhost:3001)
npm run docs
```

> The dev server is pinned to port **5000** in `package.json` to avoid conflicts with other local services. Update the script if you need to change the port.

### 4. Validate Your Setup

```bash
# Lint Next.js code
npm run lint

# Execute contract, security, and UI-adjacent tests
npm test

# Build production bundles (Next.js + docs)
npm run build
npm run docs:build
```

The docs site builds are verified in CI using GitHub Actions (`.github/workflows/docs*.yml`). Always run `npm run docs:build` locally when introducing MDX, configuration changes, or new assets.

## Local Development Workflow

1. Create a feature branch off `main`.
2. Update `.env.local` with the secrets you need (encrypt provider keys before committing any fixtures).
3. Run `npm run dev` and `npm run docs` in separate terminals if you are changing both product and documentation surfaces.
4. Use `npm test` before sending a pull request; ingestion tests exercise the Drizzle schema and fixtures. Seed your database with `scripts/usage-backfill.ts` if you need historical data.
5. Open a PR, add context in `memorybank/progress.md` when appropriate, and label documentation updates with `docs`.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for review expectations, branching guidance, and release checklists.

## Operational Utilities

- `npm run usage:backfill` (alias for `tsx scripts/usage-backfill.ts`) replays historical usage windows with configurable chunks and telemetry logging.
- `scripts/usage-telemetry-diff.ts` compares ingested data against CSV exports to confirm parity before enabling cron jobs.
- `scripts/admin-usage-sample.ts` provides a quick sanity check against the OpenAI Admin API when validating credentials.

Audit artefacts live under `audit/` (cron dry runs, telemetry diffs, rollback notes). Capture new evidence whenever you exercise ingestion pipelines or run rehearsals.

## Documentation Hub

The Docusaurus site under `docs-site/` is the canonical knowledge base. Key entry points:

- [Product requirements](docs-site/docs/product/prd.md) for MVP scope and roadmap.
- [Architecture overview](docs-site/docs/architecture/overview.md) for system context.
- [Operations runbooks](docs-site/docs/operations/runbooks.md) for deployment and incident playbooks.
- [Documentation contribution guide](docs-site/docs/contributing/documentation.md) for writing standards.

Update the Markdown files alongside code changes so the knowledge base stays authoritative. Reference [`documentation.md`](docs-site/docs/contributing/documentation.md) for taxonomy and review flow.

## Security & Compliance Highlights

- Provider keys and metadata are encrypted at rest using AES-256-GCM (`src/lib/encryption.ts`) with secrets sourced from env vars.
- Cron endpoints use timing-safe comparisons against `CRON_SECRET` and run on Vercel according to [`vercel.json`](vercel.json).
- Clerk middleware (`src/middleware.ts`) protects dashboard, analytics, and API routes; unauthenticated access redirects to Clerk-hosted auth flows.
- Ingestion telemetry and audit evidence are stored under `audit/` and cross-referenced in `memorybank/` plans to ensure traceability.

Additional details—including rate limits, authorization headers, and ingestion flags—are documented in [`ARCHITECTURE.md`](ARCHITECTURE.md) and the operations runbooks.

## What’s Next?

- Dive into [`ARCHITECTURE.md`](ARCHITECTURE.md) for component-level diagrams and data flow.
- Review [`API_REFERENCE.md`](API_REFERENCE.md) when building integrations or scripts.
- Consult [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) for common setup and ingestion issues.
- Keep the `memorybank/` notes current as you design new features or discover gaps; unresolved gaps should be logged in `memorybank/context_gaps_log.md`.

Welcome aboard—CogniTrack thrives on incremental, well-documented improvements.
