# Admin Ingestion Spike – 2025-09-30

- Replayed usage + metadata fixtures to validate dedupe + relationship diagnostics (no missing references detected).
- Report stored at `audit/spike-results/admin_ingestion_spike.json`; latest run at 2025-09-30T16:35:18.994Z via `pnpm exec tsx spikes/admin_ingestion_spike.ts`.
- Checksums compared against fixture set; see hash below for audit trail.

## Follow-ups
- Extend spike to include multi-page fixture once available.
- Capture actual execution timestamp + diff summary after live dry run.

## Execution Checklist
- [x] Run `pnpm exec tsx spikes/admin_ingestion_spike.ts` in repo root.
- [x] Compare generated console summary with stored report; update timestamps if different.
- [x] Compute `sha256sum audit/spike-results/admin_ingestion_spike.json` and paste hash below.

## Latest Hash
- `aa5edfacf6c747a554b38c85de3fce46f729b85f16940dbc281572b13ef11832` (generated 2025-09-30T16:35:22Z)
## 2025-09-30 Fixture Replay
- Command: `pnpm exec tsx spikes/admin_ingestion_spike.ts`
- Usage summary: 1 bucket, 2 raw events deduped to 1 (tokensIn=2849, tokensOut=912, costEstimate=0.003918, cursor.hasMore=false)
- Additional endpoint totals:
  - Embeddings: input_tokens=2560, num_model_requests=4
  - Moderations: input_tokens=128, num_model_requests=2
  - Images: images=4, num_model_requests=4 (bySize: 512x512=4; bySource: image.generation=4)
  - Audio speeches: characters=3500, num_model_requests=3
  - Audio transcriptions: seconds=780, num_model_requests=5
  - Vector stores: usage_bytes=1048576
  - Code interpreter sessions: num_sessions=6
  - Costs: amount_value=15.55 (line items: usage.completions=12.34, usage.images=3.21; currency: usd=15.55)
- Relationship issues: none detected.
