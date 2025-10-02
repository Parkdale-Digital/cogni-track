# Daily Usage Cron Dry-Run Summary

## Purpose
Track 48-hour staging executions of the daily usage cron when `ENABLE_DAILY_USAGE_WINDOWS` is enabled for telemetry validation without impacting production.

## Checklist
- [ ] Record start/end timestamps for each staging run.
- [ ] Capture `telemetry` payload from `/api/cron/daily-usage` response and append JSON snippet below.
- [ ] Note throttling or Retry-After headers observed; link to logs if available.
- [ ] Confirm no simulated keys (`simulatedKeys === 0`).
- [ ] Verify `windowsProcessed` matches expected day count × key count.
- [ ] File follow-up issues for any non-zero `issuesByCode` entries.

## Runs
<!-- Append newest entries to the top of this section. -->

