# Ingestion readiness assessment

## Overview
A review of fixtures, spike outcomes, and rate-limit planning indicates that ingestion endpoints are not yet ready for implementation. Several gaps in data consistency, pagination coverage, and operational guardrails must be addressed to ensure a stable rollout.

## Fixture completeness
- Fixtures now reuse the canonical project identifiers (`proj_abc123`, `proj_xyz890`), eliminating the placeholder drift noted previously. A validator still needs to fail fast when future fixtures introduce unknown IDs.
- **Action:** Wire the spike-time validator so any usage/cost `project_id` not present in `projects_list_fixture.json` aborts the run.

## Spike analysis
- The spike report now processes multi-page fixtures (`has_more=true` with `_page2` follow-ups) and aggregates per-endpoint metrics while reporting zero unknown project references. Foreign-key scans are partially implemented at the project level; service-account/certificate scans remain TODO.
- **Action:** Extend FK checks to cover service accounts, keys, and certificates, and keep pagination regressions under CI.

## Rate-limit plan
- Documentation recognizes a shared 60 RPM (burst 90) pool and recommends keeping critical calls under 30 RPM, yet the implementation only constrains the `limit` query parameter (`OPENAI_ADMIN_LIMIT`, capped at 31) and retries with fixed 0.5 s increments without honoring `Retry-After`.
- There is no scheduler to coordinate request cadence across endpoints, leaving the ingestion job vulnerable to throttling when expanded.
- **Actions:** Introduce a shared throttle (e.g., token bucket) to pace requests below 60 RPM, make the cadence configurable, enhance retries to respect rate-limit headers, and document how `OPENAI_ADMIN_LIMIT` interacts with page size versus request rate.

## Readiness summary
Fixtures and spike tooling provide a baseline, but ingestion endpoints should not proceed until referential integrity, pagination coverage, and comprehensive rate limiting are implemented. Addressing the identified actions will improve stability and scalability for production ingestion.
