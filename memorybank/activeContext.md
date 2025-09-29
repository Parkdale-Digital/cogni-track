## Current Focus
- Validate OpenAI usage ingestion accuracy with telemetry (see `IngestionTelemetry`) and resolve pricing/pricing-fallback warnings before sharing dashboards.
- Ensure admin usage mode env vars (`OPENAI_ORGANIZATION`, `OPENAI_PROJECT`) are populated prior to enabling cron refreshes.
- Ship per-key OpenAI mode toggle (standard vs org admin), capturing org/project metadata securely for ingestion headers.
