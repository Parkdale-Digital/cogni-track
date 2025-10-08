# Daily Usage Cron Dry-Run Summary

## Purpose
Track 48-hour staging executions of the daily usage cron when `ENABLE_DAILY_USAGE_WINDOWS` is enabled for telemetry validation without impacting production.

## Checklist
- [ ] Record start/end timestamps for each staging run.
- [ ] Confirm `CRON_SECRET` header is accepted in staging via `curl` smoke test before scheduling (see `docs/daily_usage_cron_runbook.md`).
- [ ] Capture `telemetry` payload from `/api/cron/daily-usage` response and append JSON snippet below.
- [ ] Note throttling or Retry-After headers observed; link to logs if available.
- [ ] Verify no simulated keys (`simulatedKeys === 0`).
- [ ] Verify `windowsProcessed` matches expected day count × key count.
- [ ] File follow-up issues for any non-zero `issuesByCode` entries.

## Runs
<!-- Append newest entries to the top of this section. -->

### Template
```
#### 2025-10-08T22:15Z (Manual Trigger)
- Request: curl --request POST ... (link to smoke log)
- Windows processed: 62 (expected 62)
- Updated events: 14
- Issues by code: {}
- Retry-After headers: none
- Notes: observed 120ms average Neon write latency.
- Artefacts: [telemetry JSON](../telemetry-audit/2025-10-08T22-15-00Z-cron.json)
```

> TODO (Ops): Replace the sample entry above with the first staging run once the cron rehearsal starts; ensure matching artefacts are checked in before closing the workstream.

### Pending Artefacts
- [ ] 48-hour cron rehearsal telemetry appended below (minimum two runs).
- [ ] Corresponding notes committed under `audit/cron-dry-run/notes-<date>.md` using the template.
- [ ] Parity diff JSON for the rehearsal stored under `audit/telemetry-audit/` and linked in notes.

### Telemetry Fields Reference
- `windowsProcessed`: Should equal number of (days × active keys) for the run window.
- `updatedEvents`: Non-zero values expected on backfill retries; investigate spikes.
- `issuesByCode`: If populated, cross-reference `src/lib/usage-fetcher.ts` issue enums before escalating.
- `manualFallbackWindows`: Signals dedupe fallback usage; if >0 for two consecutive runs, open an ingestion ticket.
