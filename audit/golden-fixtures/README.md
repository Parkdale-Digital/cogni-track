# Daily Usage Golden Fixtures

This directory stores redacted OpenAI admin usage responses used for contract testing the daily usage ingestion loop.

## Fixture Requirements
- Capture responses for at least two admin tenants that exercise cached vs uncached token fields. The helper script `scripts/admin-usage-sample.ts` can be pointed at different projects by exporting `OPENAI_*` environment variables.
- Preserve metadata fields required by ingestion parity: `project_id`, `openai_api_key_id`, `openai_user_id`, `service_tier`, `num_model_requests`, and cached token breakdowns.
- Store JSON fixtures under `daily-usage/<tenant>-<startedAt>.json` using ISO timestamps.

## Sanitization Checklist
1. Remove or hash user-identifying strings (emails, names, organization labels).
2. Round monetary or token cost fields to two decimal places where exact values are sensitive.
3. Verify no access tokens or API keys remain in headers or payloads.
4. Add a short summary of the sanitization steps performed to `test-run-logs/<timestamp>.md` alongside test execution notes.

## Usage
- Replay fixtures via the contract test scaffold (`tests/usageFetcherContract.test.ts`) which calls `normalizeFixtureEvents`. The test expects the env flag `DAILY_USAGE_CONTRACT_FIXTURES_READY=true` and optionally `DAILY_USAGE_CONTRACT_FIXTURES_DIR` when fixtures live outside this directory.
- Commit associated test output logs to `test-run-logs/` for auditability.
- Reference this README from `memorybank/daily_usage_alignment_plan.md` when updating confidence scores for Workstream 3.

### Enabling Contract Tests
1. Populate sanitized fixtures under `daily-usage/` as described above.
2. Set the environment variable `DAILY_USAGE_CONTRACT_FIXTURES_READY=true` when running `pnpm tsx tests/runAllTests.ts` (or the targeted test runner). Optionally set `DAILY_USAGE_CONTRACT_FIXTURES_DIR` to point at an alternative fixture path.
3. Run the contract test and log results to `test-run-logs/<timestamp>.md`.
