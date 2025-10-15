---
id: developer-workflow
title: Developer Workflow
description: Branching, validation, and documentation expectations for code contributors.
sidebar_position: 2
---

CogniTrack treats process and documentation as part of the product. Follow this workflow to keep changes reviewable, auditable, and aligned with the memory bank.

## Pre-PR Checklist

- Create a feature branch off `main` (`type/short-description` format).
- Sync with `memorybank/activeContext.md` and update `memorybank/progress.md` as you complete milestones.
- Update `.env.local` with required secrets; never commit real credentials.
- Run validation commands (`npm run lint`, `npm test`, `npm run build`, `npm run docs:build` when docs change).
- Capture ingestion evidence (telemetry diffs, cron dry-run logs) under `audit/` when relevant.
- Log discrepancies in `memorybank/context_gaps_log.md` if you encounter conflicting information.

## Branching & Reviews

1. Keep PRs small and scoped. Split large efforts into sequential changes with documented handoffs.
2. Provide descriptive PR summaries, validation steps, and links to updated docs or artefacts.
3. Label documentation-only changes with `docs` so release captains can prioritize reviews.
4. Request reviews from subject-matter experts (ingestion, UI, docs) as appropriate.
5. Merge via squash or rebase after approvals, ensuring follow-up tasks are tracked when confidence is below 5/10.

## Coding Standards

- **TypeScript/React:** Strict mode is enabled. Define explicit types at module boundaries and reuse shared types from `src/types`.
- **Styling:** Tailwind tokens derive from CSS variables (`tailwind.config.js`). Prefer composition over ad-hoc utility sprawl.
- **State & Effects:** Use server actions or API routes for side effects. Client components should rely on hooks like `useSafeUser` and `useToast`.
- **Security:** Never log decrypted secrets. Follow patterns in `src/app/api/keys` for Clerk auth and error handling.
- **Accessibility:** Mirror the ARIA attributes and keyboard interactions used in existing components (`UsageChart`, `AdvancedFilters`, etc.).

## Testing & Validation

| Command | Purpose |
| --- | --- |
| `npm run lint` | ESLint (core-web-vitals preset). |
| `npm test` | Aggregated ingestion, security, and component tests (`tests/runAllTests.ts`). |
| `npm run build` | Type-checks and bundles the Next.js app. |
| `npm run docs:build` | Compiles Docusaurus docs (required when docs change). |

### Ingestion-Specific Guidance

- Update fixtures under `audit/` and rerun tests when altering ingestion schemas or normalization logic.
- Execute `scripts/usage-telemetry-diff.ts` with provider CSVs prior to enabling toggles.
- Use `npm run usage:backfill` for historical replays; archive run summaries in `audit/backfill-*`.

### Database Migrations

1. Modify `src/db/schema.ts`.
2. Generate migrations with Drizzle (`npx drizzle-kit generate:pg`), targeting the `drizzle/` directory.
3. Review generated SQL, ensure idempotency, and commit alongside schema changes.
4. Document pre-checks and results in `audit/migration-prechecks.md`.

## Documentation Expectations

- Update root docs (`README.md`, `ARCHITECTURE.md`, etc.) and relevant Docusaurus pages in tandem.
- Follow [Documentation Contribution Guide](documentation.md) for frontmatter, structure, and review flow.
- Capture context shifts or open questions in the memory bank; escalate unresolved gaps per `AGENTS.md`.

## Security & Secrets

- Never commit real keys. Use placeholders like `sk-test-...` in examples.
- Document incident responses or key rotations in `audit/rollback_log.md` and update security references.
- Validate new integrations against rate limits and update `memorybank/integrations.md` with findings.

## Release & Deployment Notes

- Docs deploy to GitHub Pages via `.github/workflows/docs-deploy.yml`.
- Application deployments run on Vercel; cron schedules reside in `vercel.json`.
- When enabling feature flags (`ENABLE_*`), document rollout and rollback in the relevant memory bank plan (e.g., `memorybank/daily_usage_alignment_plan.md`).

Need help? Review the [System Map](../architecture/system-map.md), check `memorybank/`, or raise discrepancies through the gap log before proceeding.
