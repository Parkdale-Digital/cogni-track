# Ingestion readiness assessment

## Overview
A review of fixtures, spike outcomes, and rate-limit planning indicates that ingestion endpoints are not yet ready for implementation. Several gaps in data consistency, pagination coverage, and operational guardrails must be addressed to ensure a stable rollout.

## Fixture completeness
- Fixtures cover the planned admin endpoints and organization metadata, but project identifiers are inconsistent. Usage and cost fixtures reference placeholder IDs (e.g., `proj_fixture_alpha`, `proj_fixture_gamma`, `proj_fixture_theta`) that do not exist in the shipped project list (`proj_abc123`, `proj_xyz890`).
- Because completions data still points to `proj_abc123`, joins succeed despite the mismatch, hiding issues until production ingestion.
- **Actions:** Align project IDs across all fixtures and add a validator that ensures every `project_id` in usage/cost data exists in the project metadata before spike runs.

## Spike analysis
- The spike report validates deduplication (two raw events to one stored event) and confirms `hasMore=false` for current fixtures, but foreign-key checks ignore usage/cost data, so they miss the placeholder drift.
- Pagination, cursor chaining, and cross-page dedupe remain untested because fixtures lack multi-page scenarios.
- **Actions:** Extend the spike harness to scan every usage/cost record for unknown foreign keys, add fixtures with `has_more=true` and populated `next_page`, and assert stable deduped totals after pagination.

## Rate-limit plan
- Documentation recognizes a shared 60 RPM (burst 90) pool and recommends keeping critical calls under 30 RPM, yet the implementation only constrains the `limit` query parameter (`OPENAI_ADMIN_LIMIT`, capped at 31) and retries with fixed 0.5 s increments without honoring `Retry-After`.
- There is no scheduler to coordinate request cadence across endpoints, leaving the ingestion job vulnerable to throttling when expanded.
- **Actions:** Introduce a shared throttle (e.g., token bucket) to pace requests below 60 RPM, make the cadence configurable, enhance retries to respect rate-limit headers, and document how `OPENAI_ADMIN_LIMIT` interacts with page size versus request rate.

## Readiness summary
Fixtures and spike tooling provide a baseline, but ingestion endpoints should not proceed until referential integrity, pagination coverage, and comprehensive rate limiting are implemented. Addressing the identified actions will improve stability and scalability for production ingestion.
