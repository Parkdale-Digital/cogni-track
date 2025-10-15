---
id: docusaurus-adoption-plan
title: Docusaurus Adoption Plan
sidebar_label: Docusaurus Adoption Plan
description: Roadmap for rolling out the CogniTrack documentation site on Docusaurus.
last_updated: 2025-10-14
---

## Objectives

- Establish a developer-friendly documentation site that centralizes onboarding, architecture, and runbook content.
- Keep documentation close to the codebase with an automated pipeline for previewing and deploying updates.
- Provide a scalable structure for future multilingual content and versioned release notes.

## Assumptions

- The project will continue to use Next.js for the application front end; Docusaurus will serve documentation only.
- CI is available through existing pipelines (e.g., GitHub Actions) and can be extended to include documentation builds.
- Documentation content will initially focus on existing files in the `docs/` directory and relevant knowledge from the README and PRDs.

## Team Structure & Responsibilities

**Documentation Working Group:**
- **Composition:** Tech Lead + 2 senior engineers (rotating quarterly)
- **Responsibilities:** Content strategy, quality standards, tooling decisions
- **Meeting Cadence:** Bi-weekly reviews, monthly planning
- **Decision Authority:** Consensus-based with Tech Lead tie-breaker

**Content Owners:**
- **Product Team:** Product vision, roadmaps, PRDs
- **Architecture Team:** System design, data models, technical decisions
- **Operations Team:** Runbooks, on-call guides, deployment procedures
- **All Engineers:** Feature documentation (via PR requirement)

## Phase 1: Foundations

1. **Scaffold Docusaurus**
   - Install Docusaurus via `npx create-docusaurus@latest docs-site classic --typescript` into a new `docs-site/` folder at the repo root.
   - Choose the Classic template with TypeScript for consistency with the rest of the codebase.
   - Configure `.gitignore` to exclude generated build artifacts (e.g., `docs-site/build`).
2. **Align package management**
   - Since the project already uses `npm` (per `package-lock.json`), ensure the Docusaurus workspace uses `npm` as well.
   - Add Docusaurus scripts (e.g., `docs`, `docs:build`, `docs:serve`) to the root `package.json` to simplify local workflows.
3. **Integrate styling and branding**
   - Update `docs-site/docusaurus.config.ts` with site metadata (title, tagline, URL, base URL) and organization details.
   - Import existing design tokens (colors, fonts) from the Next.js app where feasible to keep brand consistency.

### Status (2025-10-14)

- [x] `docs-site/` Docusaurus workspace committed with TypeScript preset and build artifacts ignored via `.gitignore`.
- [x] Root `package.json` exposes `docs`, `docs:build`, and `docs:serve` npm scripts that delegate into the documentation workspace.
- [x] Shared design tokens centralized in `src/styles/tokens.css` and consumed by both the Next.js app and Docusaurus theme for consistent branding.
- [x] Docusaurus configured to run on port 3001 to avoid conflict with Next.js app (port 3000).
- [x] Docs workspace uses npm; `docs-site/package-lock.json` committed to version control for reproducible builds.

## Phase 2: Content Migration

1. **Define documentation information architecture**
   - Draft a navigation structure grouping concepts (e.g., Product Vision, Architecture, Operations) based on `PRD.md` and the documents under `docs/`.
   - Create top-level docs for onboarding, architecture overview, data models, and runbooks.
2. **Migrate existing Markdown**
   - Convert documents in `docs/` and key markdown files (like `README.md`, `PRD.md`) into Docusaurus pages or blog posts.
   - Use frontmatter to capture authorship, last updated metadata, and tags.
   - Ensure internal links are updated to use Docusaurus routing.
   - Remaining legacy content to migrate (Target completion: 2025-11-30):
     - [x] `docs/daily_usage_cron_runbook.md` migrated to `operations/daily-usage-cron-runbook.md` in Docusaurus (Completed 2025-10-15 by Platform Engineering)
     - [x] `docs/openapi.documented.yml` migrated to `architecture/openapi-reference.md` with downloadable asset at `/specs/openapi.documented.yml` (Completed 2025-10-15 by API Platform)
3. **Establish contribution guidelines**
   - Create `CONTRIBUTING.md` at repo root detailing how to run `npm run docs` locally, structure docs, and review PRs.
   - Update the root README to point to the Docusaurus site once deployed. *(Blocked by Milestone 3 - requires public docs URL)*

## Phase 3: Automation & Quality

1. **Local developer experience**
   - Document commands for starting the docs dev server alongside the main app.
   - Optionally add an npm script that concurrently runs both Next.js and Docusaurus for full-stack previews.
2. **Continuous Integration**
   - Existing `Docs CI` workflow already runs `npm run docs:build` and `markdown-link-check` on pull requests touching `docs-site/**`; monitor for coverage gaps and expand as the docs surface grows.
   - Evaluate additional quality tooling (e.g., `remark-lint`, `docusaurus-plugin-checklinks`) if we need deeper linting beyond the current link checker.
   3. **Preview & Deployment**
   - **Production Hosting Decision:** GitHub Pages via GitHub Actions (chosen for zero-cost hosting, native GitHub integration, and automatic HTTPS).
   - **Preview Deployments:** Configure GitHub Actions to deploy PR previews to `gh-pages-preview` branch with unique URLs.
   - **Deployment Pipeline:**
     - On PR: Build docs and run link checks (existing workflow)
     - On merge to main: Deploy to GitHub Pages at `https://cogni-track.github.io/cogni-track-replit/`
     - Include deployment status in PR comments
   - **Configuration updates:** Set `url` to `https://cogni-track.github.io` and `baseUrl` to `/cogni-track-replit/` in `docs-site/docusaurus.config.ts` (or wire via `DOCS_URL` env) so GitHub Pages routes resolve correctly.
   - **Custom Domain (Optional):** Configure `docs.cognitrack.io` if/when domain is acquired.
   - **Status (2025-10-15):** `.github/workflows/docs-deploy.yml` now builds/ships docs to GitHub Pages with PR previews, and default `url/baseUrl` values in `docusaurus.config.ts` target the GitHub Pages host.

## Phase 4: Enhancements

1. **Search and analytics**
   - **Search Provider Options:**
     - **Algolia DocSearch** (Recommended): Free for open source, excellent UX, 2-day setup time
     - **Meilisearch** (Alternative): Self-hosted option, more control, 1-week setup time
     - **Docusaurus built-in search** (Fallback): Limited features, immediate availability
   - **Evaluation Criteria:** Setup time, search quality, cost, maintenance overhead
   - **Decision Timeline:** During Milestone 4 kickoff (Q1 2026)
   - **Analytics Options:**
     - **PostHog** (Recommended): Privacy-friendly, self-hostable, rich features
     - **Google Analytics** (Alternative): Industry standard, free tier
   - **Implementation:** Add tracking codes to `docusaurus.config.ts`

2. **Versioning strategy**
   - Enable Docusaurus versioning to capture major product releases.
   - Define a process for deprecating older docs and announcing updates.

3. **Internationalization (optional)**
   - If the product roadmap includes multilingual support, configure Docusaurus i18n and establish translation workflows.

## Milestones & Deliverables

- **Milestone 1 (COMPLETE - 2025-10-07):** Docusaurus scaffold committed, root scripts updated, basic theme configured.
  - Deliverables: Working docs-site workspace, npm scripts, design token integration
  
- **Milestone 2 (Target: 2025-11-30):** Core documentation migrated, navigation finalized, contribution guide updated.
  - Deliverables: All legacy docs migrated, sidebar structure finalized, CONTRIBUTING.md updated
  - Estimated effort: 3-4 person-days
  - Owner: Documentation Working Group
  
- **Milestone 3 (Target: 2025-12-15):** CI validation and hosting pipeline live, public docs URL shared with the team.
  - Deliverables: 
    - GitHub Pages deployment workflow
    - PR preview system
    - Update docusaurus.config.ts with production URLs (`url` and `baseUrl`)
    - Public docs URL shared with team
  - Estimated effort: 2-3 person-days
  - Owner: DevOps team
  
- **Milestone 4 (Target: Q1 2026):** Search/analytics integrations and advanced features (versioning, i18n) evaluated and prioritized.
  - Deliverables: Search provider integrated, analytics tracking, versioning strategy documented
  - Estimated effort: 4-5 person-days
  - Owner: Product team + Documentation Working Group

## Risks & Mitigations

- **Content divergence between README and Docusaurus:** 
  - Mitigation: Keep README concise (< 200 lines) with links to docs site for details. Add automated check to flag README growth.
  - Owner: Documentation Working Group
  
- **Maintenance overhead:** 
  - Mitigation: Assign documentation ownership to specific teams (Product, Architecture, Operations). Establish quarterly review cycle. Include docs updates in Definition of Done for all features.
  - Owner: Engineering Manager
  
- **Build failures due to Markdown syntax:** 
  - Mitigation: Use linting (remark-lint) and pre-commit hooks to flag issues early. Add link checking to CI (already implemented).
  - Owner: DevOps team
  
- **Version drift between docs and code:**
  - Mitigation: Require docs updates in same PR as code changes. Use Docusaurus versioning for major releases.
  - Owner: All engineers (enforced via PR template)
  
- **Search indexing delays:**
  - Mitigation: Use Algolia DocSearch with webhook triggers for immediate re-indexing on deployment.
  - Owner: DevOps team
  
- **Broken external links:**
  - Mitigation: Add external link checking to monthly maintenance tasks. Use link-check GitHub Action.
  - Owner: Documentation Working Group
  
- **Low adoption/usage:**
  - Mitigation: Promote docs site in onboarding, team meetings, and Slack. Track usage metrics and iterate based on feedback.
  - Owner: Product team

- **Deployment platform issues:**
  - Mitigation: Maintain Vercel project as backup deployment target. Document rollback procedure (revert to previous commit, trigger manual deploy). Set up status monitoring with alerts.
  - Owner: DevOps team

## Success Metrics

### Baseline Measurements (October 2025)
- Average onboarding time: 5 days (estimated from recent hires)
- Documentation-related questions in Slack: ~15/week
- PRs with documentation updates: ~30% of feature PRs
- Build success rate: 100% (current state)

### Target Metrics (6 months post-launch)
**Note:** "Launch" is defined as Milestone 3 completion (public docs URL available at https://cogni-track.github.io/cogni-track-replit/)

- **Build Reliability:** Documentation site builds successfully in CI 99%+ of the time
- **Onboarding Efficiency:** Reduce average onboarding time from 5 days to 3 days (40% improvement)
- **Self-Service:** Reduce documentation-related Slack questions from 15/week to 8/week (47% reduction)
- **Documentation Coverage:** Increase PRs with documentation updates from 30% to 60%
- **User Satisfaction:** Achieve 4.0+ rating (out of 5) on quarterly documentation survey
- **Search Effectiveness:** 80%+ of searches result in page visit (post-search integration)
- **Page Views:** 200+ unique page views per week

### Measurement Methodology
- Onboarding time: Track via HR onboarding checklist completion dates
- Slack questions: Weekly audit of #engineering-help channel
- PR documentation: Automated analysis via GitHub API
- Build success: GitHub Actions metrics
- User satisfaction: Quarterly survey sent to all engineering team members
- Search/page views: Google Analytics or PostHog (post-integration)

### Review Cadence
- Monthly: Review build reliability and PR documentation metrics
- Quarterly: Full metrics review with team feedback session
- Annually: Comprehensive audit and goal adjustment
