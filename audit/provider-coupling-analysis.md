# Provider Coupling Analysis – Anthropic Usage Integration
_Generated: 2025-10-09 by Codex (Step 2 audit)_

## Scope
Initial audit of the current usage ingestion stack to surface OpenAI-specific coupling points, schema dependencies, and telemetry assumptions before introducing the Anthropic provider abstraction.

## Code Coupling Inventory
- `src/lib/usage-fetcher.ts`: end-to-end ingestion logic is hard-coded for OpenAI (`providerKeys.provider === 'openai'`, OpenAI-specific env vars, admin throttling, pricing tables, normalized token fields, error types, pagination sanitizers).
- `scripts/usage-backfill.ts`: CLI resolves target keys by filtering provider keys to `'openai'`; assumes OpenAI-only telemetry fields.
- `src/app/api/usage/route.ts` & `src/app/api/cron/daily-usage/route.ts`: orchestration routes depend on `fetchAndStoreUsageForUser`, which today only supports OpenAI keys and metadata semantics.
- `src/lib/usage-event-helpers.ts`: metadata selection/export exposes `openai*` columns directly; provider value derives from join with `provider_keys`.
- `src/types/usage.ts`: client-facing types encode OpenAI metadata (e.g., `openaiApiKeyId`, `openaiUserId`) rather than provider-agnostic discriminated unions.

## Schema & Dedupe Observations
- `usage_events` table relies on joining through `key_id → provider_keys.id` to determine provider; no dedicated provider column today.
- Unique index `usage_admin_bucket_idx` (see `drizzle/0003_usage_event_windows.sql`) enforces dedupe on OpenAI-specific metadata: project, API key ID, user ID, service tier, batch flag, window bounds.
- Cached token columns (`input_cached_tokens`, `input_uncached_tokens`, etc.) map to OpenAI admin payload fields; no columns exist for Anthropic cache_creation/cache_read tokens.
- Manual dedupe fallback in `usage-fetcher.ts` mirrors the same OpenAI-specific tuple, meaning provider must be added to both the partial index and manual clause.

## Token Field Mapping (Current State)
| Provider Field (OpenAI) | Storage Column | Notes |
| --- | --- | --- |
| `input_tokens` / `prompt_tokens` | `tokensIn` | Direct mapping |
| `output_tokens` / `completion_tokens` | `tokensOut` | Direct mapping |
| `input_cached_tokens` | `inputCachedTokens` | Cached vs uncached split |
| `input_uncached_tokens` | `inputUncachedTokens` | Cached vs uncached split |
| `input_text_tokens` | `inputTextTokens` | Text modality |
| `output_text_tokens` | `outputTextTokens` | Text modality |
| `input_cached_text_tokens` | `inputCachedTextTokens` | Text cache reuse |
| `input_audio_tokens`, `output_audio_tokens`, etc. | `inputAudioTokens`, `outputAudioTokens`, ... | Modalities already modeled |
| _Missing for Anthropic_ | _(TBD)_ | Need columns for `cache_creation_input_tokens`, `cache_read_input_tokens` |

## Compatibility Matrix (Draft)
| Dimension | OpenAI Implementation | Anthropic Considerations | Notes / Gaps |
| --- | --- | --- | --- |
| Authentication | Bearer token, optional org/project headers | Requires `x-api-key` and `anthropic-version` header | Need provider-aware credential/decryption path |
| Pagination | `next_page` absolute URL, sanitized against `api.openai.com` | Cursor-based (opaque string) per Context7 docs | Add generic cursor handling + provider-specific validators |
| Rate Limiting | Custom token bucket + Retry-After respect | Anthropic exposes `anthropic-ratelimit-*` headers; exact semantics TBD | Abstraction must surface structured retry hints |
| Token Fields | Extensive per-modality splits | Includes cache creation/read token metrics | Schema change required (new nullable columns + normalization logic) |
| Cost Reporting | Pricing table + fallback estimation when provider omits cost | Anthropic cost report endpoint returns USD totals | Introduce provider-specific cost normalizers and currency validation |
| Telemetry | Metrics named `openai.*`, issues recorded with OpenAI codes | Need `anthropic.*` telemetry namespace | Extend telemetry to include provider dimension |

## Open Questions / Risks
- How to maintain dedupe integrity when multiple providers share the same `key_id` namespace (e.g., migrating existing rows)?
- What normalization is needed when providers omit certain metadata (Anthropic may lack `project_id` analogues)?
- Ensure feature flags can disable Anthropic without impacting OpenAI ingestion cron flows.

## Next Actions
1. Design provider abstraction interfaces (Step 3a) using the inventory above to drive required method signatures.
2. Draft ADR for schema strategy (normalized vs denormalized provider attribution) before adding new columns.
3. Capture Anthropic fixture responses to validate pagination, rate-limit headers, and cache token semantics.
