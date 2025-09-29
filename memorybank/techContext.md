## 2025-09-29 Usage Ingestion Hardening
- `src/lib/usage-fetcher.ts` now returns detailed `IngestionTelemetry`, logs provider failures, and only emits simulated events when `ENABLE_SIMULATED_USAGE=true`.
- Pricing map recognizes GPT-5 dated SKUs and cached tiers, with pattern fallbacks and `OPENAI_PRICING_OVERRIDES` support.
- Model identifiers from OpenAI usage payloads are normalized (hyphens/underscores preserved) so cost attribution matches dashboard naming.
- Admin mode enforces `OPENAI_ORGANIZATION` and `OPENAI_PROJECT` env vars via `UsageConfigurationError`; cron and manual refresh flows surface configuration issues.
- Analytics refresh UI uses toast notifications and `router.refresh()` for post-ingestion feedback while exposing telemetry warnings.
