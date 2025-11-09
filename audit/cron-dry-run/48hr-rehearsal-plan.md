# 48-Hour Cron Rehearsal Plan

## Objective
Execute a 48-hour staging cron rehearsal with `ENABLE_DAILY_USAGE_WINDOWS=true` to validate:
- Daily window ingestion reliability
- Telemetry accuracy and completeness
- Throttling/rate limit handling
- Error recovery mechanisms
- Parity with expected usage data

## Prerequisites

### Environment Setup
- [ ] Staging environment accessible with valid credentials
- [ ] `ENABLE_DAILY_USAGE_WINDOWS=true` set in staging env vars
- [ ] `CRON_SECRET` configured and tested
- [ ] `OPENAI_ORGANIZATION` and `OPENAI_PROJECT` populated for admin mode
- [ ] Database migration `0003_usage_event_windows.sql` applied

### Baseline Metrics
- [ ] Capture current staging DB state (row counts, latest window timestamps)
- [ ] Document expected window count for rehearsal period
- [ ] Verify at least 1-2 active provider keys exist in staging

### Tooling Verification
- [ ] Test manual cron trigger: `curl -i -H "Authorization: Bearer $CRON_SECRET" [staging-url]/api/cron/daily-usage`
- [ ] Verify telemetry diff script runs: `node tmp/usage-telemetry-diff.mjs --skip-db`
- [ ] Confirm access to Vercel logs for monitoring

## Execution Plan

### Phase 1: Initial Setup (Day 0)
**Time**: 2 hours before rehearsal start

1. **Baseline Capture**
   ```bash
   # Run telemetry diff to establish baseline
   node tmp/usage-telemetry-diff.mjs --output audit/telemetry-audit/baseline-rehearsal.json

   # Record DB state
   psql $DATABASE_URL -c "SELECT COUNT(*), MAX(window_end) FROM usage_events WHERE window_start IS NOT NULL"
   ```

2. **Smoke Test**
   ```bash
   # Test manual trigger
   curl -i -H "Authorization: Bearer $CRON_SECRET" [staging-url]/api/cron/daily-usage > audit/cron-dry-run/smoke-rehearsal-day0.log
   ```

3. **Documentation**
   - Create `audit/cron-dry-run/notes-rehearsal-day0.md` from template
   - Record baseline metrics and configuration state

### Phase 2: 48-Hour Monitoring (Day 1-2)
**Execution Window**: 48 hours starting [YYYY-MM-DD HH:00 UTC]

#### Scheduled Checks (Every 12 hours)
At hours 0, 12, 24, 36, 48:

1. **Trigger Cron Manually**
   ```bash
   TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
   curl -i -H "Authorization: Bearer $CRON_SECRET" \
     [staging-url]/api/cron/daily-usage > audit/cron-dry-run/run-$TIMESTAMP.log
   ```

2. **Capture Telemetry**
   - Extract telemetry payload from response
   - Record in corresponding notes file
   - Check for issues: `windowsProcessed`, `issuesByCode`, `manualFallbackWindows`

3. **Monitor Logs**
   - Review Vercel function logs for errors
   - Check for rate limit headers (Retry-After)
   - Verify ingestion completion times

4. **Spot Check Database**
   ```bash
   # Verify new windows are being created
   psql $DATABASE_URL -c "SELECT COUNT(*), MAX(window_end), MIN(window_start) FROM usage_events WHERE window_start IS NOT NULL AND updated_at > NOW() - INTERVAL '12 hours'"
   ```

#### Daily Notes Template
For each run, create `notes-rehearsal-day[N]-run[M].md`:
- Run timestamp (UTC)
- Trigger mode (manual curl)
- Feature flag state
- Windows processed
- Updated events
- Issues by code
- Retry-After headers
- Manual fallback usage
- Notable observations

### Phase 3: Validation (Day 3)
**Time**: 4 hours after rehearsal completion

1. **Final Telemetry Diff**
   ```bash
   node tmp/usage-telemetry-diff.mjs --output audit/telemetry-audit/post-rehearsal.json
   ```

2. **Data Integrity Checks**
   - Compare expected vs actual window counts
   - Verify no duplicate windows created
   - Check token counts match OpenAI dashboard
   - Validate cost estimates are reasonable

3. **Performance Analysis**
   - Review ingestion latency (target: <5min p95)
   - Check error rates (target: <1%)
   - Analyze throttling events
   - Document any manual fallback usage

4. **Update Summary**
   - Complete checklist in `audit/cron-dry-run/summary.md`
   - Link all notes files and artefacts
   - Document findings and recommendations

## Success Criteria

### Required Outcomes
- ✅ Zero missing windows in parity diff (post-rehearsal vs baseline)
- ✅ `windowsProcessed` matches expected count (days × active keys)
- ✅ No critical errors in `issuesByCode`
- ✅ Ingestion latency within SLA (<5min p95)
- ✅ Error rate <1%
- ✅ Manual fallback usage documented and explained

### Warning Indicators (Require Investigation)
- ⚠️ Any non-zero `issuesByCode` entries
- ⚠️ Manual fallback windows >10% of total
- ⚠️ Rate limit hits requiring Retry-After delays
- ⚠️ Ingestion times >5min consistently

### Failure Conditions (Abort Rehearsal)
- ❌ Data corruption detected (duplicate windows with different data)
- ❌ Critical errors blocking all ingestion
- ❌ Parity diff shows >5% missing windows
- ❌ Database performance degradation

## Rollback Plan

If rehearsal reveals critical issues:

1. **Immediate Actions**
   - Set `ENABLE_DAILY_USAGE_WINDOWS=false` in staging
   - Document failure mode in notes
   - Capture error logs and telemetry

2. **Data Cleanup**
   - Assess if rehearsal data should be purged
   - If needed: `DELETE FROM usage_events WHERE window_start IS NOT NULL AND updated_at > '[rehearsal-start]'`
   - Re-run baseline telemetry diff to verify cleanup

3. **Issue Tracking**
   - Create tickets for identified issues
   - Link to rehearsal notes and artefacts
   - Assign owners and target fixes

4. **Re-Schedule**
   - Wait for fixes to be deployed
   - Plan new rehearsal date
   - Update this plan with lessons learned

## Post-Rehearsal Actions

### Documentation Updates
- [ ] Update `memorybank/daily_usage_progress.md` with rehearsal results
- [ ] Update `docs-site/docs/operations/daily-usage-cron-runbook.md` if operational changes needed
- [ ] Record completion in `memorybank/progress.md`

### Confidence Scoring
- Update confidence scores in `memorybank/daily_usage_alignment_plan.md`:
  - Workstream 2 (Ingestion Window & Scheduling): Target 7/10 after successful rehearsal
  - Workstream 3 (Per-Day Fetch Loop): Increase confidence based on results

### Next Steps
- [ ] Schedule Documentation Working Group review (if not already done)
- [ ] Plan production rollout timeline
- [ ] Prepare contract tests implementation
- [ ] Capture golden fixtures from rehearsal data

## Notes and Observations

### Known Limitations
- Staging may have lower data volume than production
- Network conditions may differ from production
- Cost estimates use same pricing data as production

### Questions to Answer
- How does ingestion perform under load?
- Are there specific time windows with issues?
- Does manual fallback usage indicate index problems?
- Are telemetry metrics actionable for monitoring?

---

**Created**: 2025-11-09
**Owner**: Engineering Team
**Status**: Planning
**Next Review**: After rehearsal completion
