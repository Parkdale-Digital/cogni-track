# Documentation Expansion Plan

## Overview
- **Objective:** Expand Docusaurus product and architecture sections using existing repository knowledge so contributors can find roadmap, ingestion, and telemetry guidance without digging through memory bank notes.
- **Status:** Draft pages added to docs-site; awaiting Documentation Working Group review and full docs build verification.

## Proposed Additions

### Product Section (3 new docs)
- `product/vision-and-personas.md`: Promote timeless content from `memorybank/productContext.md` (vision, personas, value props). Filter out date-specific objectives.
- `product/anthropic-integration-roadmap.md`: Summarize multi-provider strategy from `memorybank/anthropic_usage_integration_plan.md` and `activeContext.md`.
- `product/beta-readiness-tracker.md`: Track beta KPIs and outstanding blockers using `memorybank/daily_usage_progress.md` and telemetry audits.

### Architecture Section (3 new docs)
- `architecture/usage-ingestion-pipeline.md`: Describe ingestion flow, AES-GCM handling, and dedupe strategy (sources: `memorybank/systemPatterns.md`, `memorybank/daily_usage_ingestion_strategy.md`, `memorybank/techContext.md`).
- `architecture/telemetry-and-observability.md`: Document metrics, diff tooling, and alert thresholds leveraging `audit/telemetry-audit/` artefacts and `scripts/usage-telemetry-diff.ts`.
- `architecture/environment-configuration.md`: Capture environment variables, secrets management, and parity expectations informed by `.envrc`, `.env.local`, and security controls.

## Sidebar Configuration

### Product Section (Exact Order)
```typescript
items: [
  'product/prd',
  'product/vision-and-personas',           // NEW
  'product/anthropic-integration-roadmap', // NEW  
  'product/beta-readiness-tracker',        // NEW
  'product/docusaurus-adoption-plan'
]
```

### Architecture Section (Exact Order)
```typescript
items: [
  'architecture/overview',
  'architecture/usage-ingestion-pipeline',      // NEW - foundational
  'architecture/openai-admin-migration-design', // EXISTING
  'architecture/telemetry-and-observability',   // NEW - operational
  'architecture/environment-configuration',     // NEW - operational
  'architecture/openapi-reference'              // EXISTING
]
```

**Rationale**: Ingestion pipeline placed before migration design to establish foundational concepts. Telemetry and environment docs follow as operational concerns.

## Content Filtering Guidelines

### Include in Public Docs
- ✅ Vision statements and strategic direction
- ✅ Persona descriptions and user needs
- ✅ Architectural patterns and design decisions
- ✅ Security controls and compliance requirements
- ✅ Environment variable schemas and configuration guides
- ✅ General capability descriptions

### Exclude from Public Docs
- ❌ Specific dates and quarters (e.g., "Q4 2025", "2025-10-01")
- ❌ Internal stakeholder names and team assignments
- ❌ Work-in-progress status updates
- ❌ Pending approval blockers
- ❌ Internal meeting references

### Transform for Public Docs
- 🔄 "Q4 2025: Ship admin mode" → "Admin mode enables organization-wide telemetry"
- 🔄 "Pending legal review 2025-10-02" → "Subject to compliance validation"
- 🔄 "Alice to approve" → "Requires stakeholder approval"

## Frontmatter Template

All new docs must include:
```markdown
---
title: [Page Title]
description: [One-sentence description for SEO/preview]
sidebar_position: [number]
---
```

## Required Cross-Links

Establish these connections between docs:
- `usage-ingestion-pipeline.md` → `telemetry-and-observability.md` (monitoring section)
- `usage-ingestion-pipeline.md` → `environment-configuration.md` (required env vars)
- `beta-readiness-tracker.md` → `telemetry-and-observability.md` (metrics definitions)
- `anthropic-integration-roadmap.md` → `usage-ingestion-pipeline.md` (multi-provider context)

## Validation Workflow

### 1. Local Validation (Required)
- Run `npm run docs:build` in `docs-site/` directory
- Verify no broken links or build errors
- Check frontmatter completeness for all six new docs
- Test cross-links navigate correctly

### 2. PR Submission (Required)
- Submit PR with all six new docs + sidebar changes
- Wait for `Docs CI` workflow to pass
- Request review from Documentation Working Group
- Address any feedback or build failures

### 3. Post-Merge Validation (Required)
- Verify deployed docs at production URL
- Test all cross-links in live environment
- Confirm sidebar navigation works as expected

## Rollback Strategy
- If any new page introduces issues:
  - `git checkout HEAD~1 -- <doc-paths>` (or targeted revert).
  - Re-run validation checklist.
  - Log the event in `rollback_log.md` with impacted files and rationale.

## Memorybank Synchronization Protocol

### Maintenance Schedule
- **Frequency**: Quarterly reviews or when major features ship
- **Ownership**: Documentation Working Group maintains sync schedule

### Sync Process
1. Identify memorybank updates that affect public docs
2. Extract timeless patterns and architectural decisions
3. Apply content filtering guidelines (see above)
4. Update relevant Docusaurus pages
5. Keep memorybank as source of truth for time-bound operational details

### Source of Truth Hierarchy
- **Memorybank**: Time-bound objectives, internal status, WIP features
- **Public Docs**: Timeless architecture, stable features, user-facing guidance

## Confidence Tracking
- Product doc additions: **6/10** (pending WG scope confirmation; increases to 8/10 post-approval)
- Architecture doc additions: **7/10** (pending telemetry SME review; increases to 9/10 with sign-off)
- Sidebar structure: **9/10** (clear ordering defined with rationale)
- Validation pipeline: **8/10** (workflow clarified with required steps)
- Content filtering: **7/10** (guidelines established; needs WG validation)
- Cross-linking strategy: **8/10** (specific requirements documented)
