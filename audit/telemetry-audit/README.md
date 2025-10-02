# Telemetry Audit Evidence Log

## Objective
Maintain artefacts (screenshots, CSV excerpts, diff reports) that demonstrate parity between `usage_events` rows and OpenAI completions exports.

## Capture Guidance
- [ ] Store raw CSV snippets (anonymized) that highlight each required column.
- [ ] Attach screenshots from manual spot-checks covering three distinct project tiers.
- [ ] Document tool/version details for scripted diffs.
- [ ] Summarize findings and confidence adjustments in `memorybank/daily_usage_alignment_plan.md` after each audit.

## Scripted Diff Workflow
Use the helper to baseline multiple exports against staging:

```bash
# Example (writes diff JSON next to audit artefacts)
tsx scripts/usage-telemetry-diff.ts \
  --csv openAI-data/completions_usage_2025-09-01_2025-10-01.csv \
  --csv-dir openAI-data/additional_exports \
  --from 2025-09-01T00:00:00Z \
  --to 2025-10-01T00:00:00Z \
  --output audit/telemetry-audit/latest-diff.json
```

- Include `DATABASE_URL` in the environment to compare against staging; otherwise pass `--skip-db` to capture CSV-only totals.
- Archive the generated JSON and any supporting notes in this directory with a timestamped filename.

## Artefacts
<!-- Add links to stored evidence files here. -->

