# Contributing to CogniTrack

CogniTrack depends on incremental, well-documented improvements. This guide captures the workflow, coding standards, and validation steps expected before opening a pull request.

## Quick Checklist

- [ ] Create a feature branch off `main`.
- [ ] Sync with `memorybank/activeContext.md` and log notable work in `memorybank/progress.md` when appropriate.
- [ ] Update `.env.local` with the secrets you need; never commit real credentials.
- [ ] Run `npm run lint`, `npm test`, and (if applicable) `npm run docs:build`.
- [ ] Capture ingestion evidence in `audit/` when touching data pipelines or cron jobs.
- [ ] Cross-link relevant docs (README, ARCHITECTURE.md, Docusaurus pages) and keep `memorybank/context_gaps_log.md` current if you discover discrepancies.

## Branching & Pull Requests

1. **Branch naming:** Use `type/short-description` (e.g., `feat/anthropic-ingestion`, `fix/usage-upsert`). Avoid pushing directly to `main`.
2. **Scope:** Prefer small, reviewable changes. Larger efforts should be split into sequential PRs with clear hand-offs recorded in `memorybank/`.
3. **PR description:** Summarize the change, reference relevant docs, list validation commands, and note any telemetry or audit artefacts produced.
4. **Labels:** Add `docs` when Markdown or Docusaurus content changes. Tag reviewers who own the touched areas (ingestion, UI, documentation).
5. **Merging:** Squash or rebase after approvals, ensuring follow-up tasks are logged if confidence is <5 (per `AGENTS.md` escalation guidelines).

## Coding Standards

- **TypeScript & React:** The project enforces strict mode (`tsconfig.json`). Favor explicit types at module boundaries and reuse shared types from `src/types/`.
- **Styling:** Tailwind CSS tokens derive from CSS variables (`tailwind.config.js`). Keep new utilities consistent and prefer component-level composition.
- **State management:** Components are client-first unless server data fetching is required. Use server actions (`'use server'`) or route handlers for side effects.
- **Security by default:** When introducing API routes, follow the patterns in `src/app/api/keys` (Clerk auth, error handling, logging guardrails). Never log decrypted secrets.
- **Accessibility:** UI components in `src/components/` already expose ARIA labels and keyboard navigation. Mirror these conventions in new components to maintain parity.

## Testing & Validation

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint (Next.js core-web-vitals config) across the Next.js workspace. |
| `npm test` | Aggregated ingestion, security, and UI-adjacent tests (`tests/runAllTests.ts`). |
| `npm run build` | Production Next.js build (type checking, bundling). |
| `npm run docs:build` | Docusaurus static build (required when docs-site content changes). |

### Ingestion-Specific Testing

- **Contract fixtures:** Update fixtures under `audit/` and rerun `npm test` when changing ingestion schemas or normalization logic.
- **Telemetry diffs:** Run `tsx scripts/usage-telemetry-diff.ts` with the relevant CSV exports when verifying parity before enabling feature flags.
- **Backfills:** Use `npm run usage:backfill` for staged historical imports; archive run summaries under `audit/backfill-*`.

### Database Migrations

1. Add or modify tables in `src/db/schema.ts`.
2. Generate SQL with `npx drizzle-kit generate:pg` (or equivalent) targeting the `drizzle/` directory.
3. Review generated SQL for safety and idempotency; update `drizzle/meta/` only through Drizzle tooling.
4. Record migration plans or validation evidence in `audit/migration-prechecks.md`.

## Documentation Expectations

- **README / ARCHITECTURE / CONTRIBUTING / API:** Keep root-level docs synchronized with codebase changes; cross-link Docusaurus pages for deeper dives.
- **Docusaurus:** Follow `docs-site/docs/contributing/documentation.md` for frontmatter, structure, and review process. Always run `npm run docs:build`.
- **Memory bank:** When decisions affect active workstreams, update `memorybank/activeContext.md` and append entries to `memorybank/progress.md`. Open gaps should be logged in `memorybank/context_gaps_log.md`.

## Security & Secrets

- Never commit real secrets. Use placeholders in examples (e.g., `sk-test-...`).
- If you rotate keys or discover exposure, document the incident in `audit/rollback_log.md` and coordinate with the security controls doc (`docs-site/docs/operations/security/openai-admin-security-controls.md`).
- Validate new integrations against rate limits and authentication requirements; expand `memorybank/integrations.md` as needed.

## Release & Deployment Notes

- Docs are deployed to GitHub Pages via `.github/workflows/docs-deploy.yml`. Verify the pipeline when changing build outputs or dependencies.
- Application deployments rely on Vercel (cron schedule defined in `vercel.json`). Capture dry-run evidence before updating schedules or secrets.
- When enabling new feature flags (`ENABLE_*`), record the rollout plan and rollback steps in `memorybank/daily_usage_alignment_plan.md` or relevant plans.

## Need Help?

- Review the architecture docs (`ARCHITECTURE.md`, `docs-site/docs/architecture/*.md`) to understand existing patterns.
- Check `memorybank/` for open questions, alignment plans, and telemetry checklists.
- If you encounter an unresolved discrepancy, create a new entry in `memorybank/context_gaps_log.md` and escalate per `AGENTS.md`.

Thanks for contributing! Consistent process and documentation keep CogniTrack reliable for the teams who depend on it.
