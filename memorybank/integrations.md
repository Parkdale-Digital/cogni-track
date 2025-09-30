# OpenAI Usage Integrations

## Authentication & Headers
- All endpoints require an admin-scoped API key passed via `Authorization: Bearer <OPENAI_ADMIN_KEY>` and the org-scoped headers already documented in the ingestion pipeline (`OpenAI-Organization`, `OpenAI-Project`).
- Requests are available only to organization administrators; project-scoped keys do not have access.
- Timestamps use Unix seconds. Always request the minimal time window needed to avoid 400 errors for oversize buckets.

## Shared Query Controls
| Parameter | Notes |
| --- | --- |
| `start_time` | Required for every usage/costs endpoint; inclusive bucket start. |
| `end_time` | Optional exclusive end time. Omit to default to "now". |
| `bucket_width` | Supports `1m`, `1h`, `1d` (costs only support `1d`). Controls granularity and the default/max `limit`. |
| `limit` | Bucket count. Respect endpoint-specific caps (`1d`: max 31; `1h`: max 168; `1m`: max 1440; costs: max 180). |
| `group_by` | Array of fields to aggregate results (varies per endpoint). Results surface the selected dimensions as nullable fields. |
| `page` | Cursor returned in `next_page`; required for pagination of long ranges. |
| `api_key_ids`, `project_ids`, `user_ids`, `models` | Optional filters (availability depends on endpoint). |

## Usage Endpoints
### Completions Usage — `GET /v1/organization/usage/completions`
- Extra filters: `batch` (true/false) to separate Jobs API traffic.
- Extra grouping fields: `model`, `batch`, `api_key_id`, `project_id`, `user_id`.
- Result metrics: `input_tokens`, `input_cached_tokens`, `input_audio_tokens`, `output_tokens`, `output_audio_tokens`, `num_model_requests`.
- Use when reconciling total token consumption or differentiating cached token usage for cost attribution.

### Embeddings Usage — `GET /v1/organization/usage/embeddings`
- Group by: `model`, `api_key_id`, `project_id`, `user_id`.
- Result metrics: `input_tokens`, `num_model_requests`.
- Suitable for tracking vector ingestion volumes alongside model-level cost curves.

### Moderations Usage — `GET /v1/organization/usage/moderations`
- Mirrors embeddings controls; supports grouping by `model`, `project_id`, `user_id`, `api_key_id`.
- Result metrics: `input_tokens`, `num_model_requests`.
- Pair with alerting when moderation volume spikes for specific projects.

### Images Usage — `GET /v1/organization/usage/images`
- Additional filters: `sizes` (`256x256`, `512x512`, `1024x1024`, `1792x1792`, `1024x1792`), `sources` (`image.generation`, `image.edit`, `image.variation`).
- Group by: `model`, `project_id`, `user_id`, `api_key_id`, `size`, `source`.
- Result metrics: `images`, `num_model_requests`.
- Capture both generation and editing flows; ensure dashboards surface size/source context for pricing.

### Audio Speeches Usage — `GET /v1/organization/usage/audio_speeches`
- Group by: `model`, `project_id`, `user_id`, `api_key_id`.
- Result metrics: `characters`, `num_model_requests`.
- Use for speech synthesis workloads (text-to-speech).

### Audio Transcriptions Usage — `GET /v1/organization/usage/audio_transcriptions`
- Group by: `model`, `project_id`, `user_id`, `api_key_id`.
- Result metrics: `seconds`, `num_model_requests` (captures audio duration processed).
- Monitor STT usage and detect long-running transcription pipelines.

### Vector Stores Usage — `GET /v1/organization/usage/vector_stores`
- Filter/group only by `project_id`.
- Result metric: `usage_bytes` (storage consumed during bucket window).
- Feed storage dashboards and automate alerts when projects approach vector quota.

### Code Interpreter Sessions Usage — `GET /v1/organization/usage/code_interpreter_sessions`
- Filter/group by `project_id`.
- Result metric: `num_sessions` per bucket.
- Use to bill notebook-like interactive sessions separately from standard completions.

## Financial Endpoint
### Costs — `GET /v1/organization/costs`
- Bucketing limited to `1d` (daily); `limit` supports up to 180 buckets.
- Group by: `project_id`, `line_item`.
- Result metrics: `amount.value`, `amount.currency`, plus optional grouping fields.
- Primary source for org-level billing reconciliation; combine with usage endpoints for derived unit economics.

## Integration Notes
- Responses follow a shared `page -> bucket -> results` hierarchy. Update the ingestion layer to normalize these results into per-resource tables (`organization.usage.*` objects map 1:1 to new admin schemas).
- The spike harness should be extended with fixtures for each endpoint above to validate dedupe and grouping behaviours before cron activation.
- Alert thresholds: leverage `num_model_requests` (tokens) for rate anomalies and `usage_bytes` / `amount.value` for spend-related guardrails.

## Pre-Implementation Roadmap
| Step | Description | Outputs | Status |
| --- | --- | --- | --- |
| Capture sanitized usage fixtures | Follow playbook in `audit/admin-api-fixtures/ENDPOINTS.md` to gather JSON snapshots for embeddings, moderations, images, audio (speeches/transcriptions), vector stores, code interpreter sessions, and costs. | `usage_*_fixture.json`, `costs_fixture.json`, updated `CHECKSUMS.sha256` | Completed |
| Extend spike harness coverage | Load new fixtures in `spikes/admin_ingestion_spike.ts`, assert endpoint-specific counters, and emit expanded telemetry in `admin_ingestion_spike.json`. | Updated spike script + report deltas | Completed |
| Document validation evidence | Append before/after output and any anomalies to `audit/spike-results/ADMIN_INGESTION_SPIKE_NOTES.md`; confirm `relationshipIssues` stays empty. | Reviewed notes + artifact links | Completed |
| Implementation readiness checkpoint | Review fixture completeness, spike results, and rate-limit plan with stakeholders before coding ingestion endpoints. | Sign-off notes + go/no-go decision | Completed |
