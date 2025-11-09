# Golden Fixture Capture Workflow

## Overview

This document provides a step-by-step workflow for capturing, sanitizing, and validating golden fixtures used in contract testing for daily usage ingestion.

**Related Documentation**:
- [Golden Fixtures README](./README.md) - Requirements and sanitization checklist
- [Contract Test](../../tests/usageFetcherContract.test.ts) - Test implementation
- [Daily Usage Alignment Plan](../../memorybank/daily_usage_alignment_plan.md) - Workstream 3 details

## Prerequisites

### Environment Setup
- [ ] Access to staging or production environment with OpenAI admin API credentials
- [ ] `OPENAI_ORGANIZATION` and `OPENAI_PROJECT` environment variables set
- [ ] `OPENAI_API_KEY` with admin permissions configured
- [ ] Node.js and dependencies installed (`npm install`)

### Tools Verification
```bash
# Verify admin-usage-sample script exists
ls -l scripts/admin-usage-sample.ts

# Verify sanitization script exists
ls -l scripts/sanitize-admin-usage-fixture.ts

# Verify summary script exists
ls -l scripts/summarize-daily-usage-fixture.ts
```

## Capture Process

### Step 1: Identify Target Tenants

Select at least 2 tenants that represent different usage patterns:

1. **Cached-Heavy Tenant**: High proportion of `inputCachedTokens`
2. **Uncached-Heavy Tenant**: Primarily standard `inputTokens`

**Rationale**: Contract tests validate both cached and uncached token handling paths.

### Step 2: Capture Raw Fixtures

For each target tenant:

```bash
# Set tenant-specific environment variables
export OPENAI_ORGANIZATION="org_xxx"
export OPENAI_PROJECT="proj_yyy"
export OPENAI_API_KEY="sk-xxx"

# Capture raw usage data
tsx scripts/admin-usage-sample.ts > audit/golden-fixtures/raw/tenant-[name]-$(date -u +%Y%m%dT%H%M%SZ).json

# Verify capture
cat audit/golden-fixtures/raw/tenant-[name]-*.json | jq '.data | length'
```

**Capture Template** (use `capture-template.md`):
```bash
cp audit/golden-fixtures/capture-template.md audit/golden-fixtures/raw/tenant-[name]-[date]-capture.md
```

Fill in:
- Capture timestamp
- Tenant identifier (hashed if sensitive)
- Environment (staging/production)
- Date range captured
- Total events count
- Notable characteristics (cached ratio, model distribution, etc.)

### Step 3: Sanitize Fixtures

Apply sanitization to remove sensitive data:

```bash
# Set deterministic hashing salt (optional but recommended for consistency)
export DAILY_USAGE_SANITIZE_SALT="cogni-track-golden-fixtures-2025"

# Sanitize each raw fixture
tsx scripts/sanitize-admin-usage-fixture.ts \
  audit/golden-fixtures/raw/tenant-[name]-[date].json \
  audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
```

**Sanitization Checklist** (from README.md):
- [ ] User-identifying strings removed or hashed (emails, names, org labels)
- [ ] Monetary/token cost fields rounded to 2 decimal places
- [ ] No access tokens or API keys in headers/payloads
- [ ] Project IDs preserved (required for parity validation)
- [ ] Model identifiers preserved
- [ ] Token counts preserved exactly
- [ ] Window timestamps preserved

**Verification**:
```bash
# Check for sensitive patterns
grep -i "email\|@\|password\|secret\|token" audit/golden-fixtures/daily-usage/tenant-[name]-[date].json

# Verify structure preserved
jq '.data | length' audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
```

### Step 4: Generate Summary

Create a summary to review fixture characteristics:

```bash
tsx scripts/summarize-daily-usage-fixture.ts \
  audit/golden-fixtures/daily-usage/tenant-[name]-[date].json \
  > audit/golden-fixtures/daily-usage/tenant-[name]-[date]-summary.txt
```

Review summary for:
- Total events count
- Unique models
- Cached vs uncached token distribution
- Cost estimate range
- Window date range
- Project/key/user metadata coverage

### Step 5: Create Expected Totals (Optional but Recommended)

For high-confidence validation, create expected totals file:

```bash
# Generate template
cp audit/golden-fixtures/expected-totals-template.json \
  audit/golden-fixtures/expected-totals/tenant-[name]-[date].expected.json
```

Populate with known totals from:
- OpenAI dashboard (for cross-validation)
- Summary output from Step 4
- Internal telemetry if available

**Expected Totals Format**:
```json
{
  "fixture": "tenant-[name]-[date].json",
  "expectedTotals": {
    "totalEvents": 150,
    "totalInputTokens": 45000,
    "totalOutputTokens": 12000,
    "totalCachedTokens": 8000,
    "totalCost": 2.45,
    "uniqueModels": ["gpt-4", "gpt-3.5-turbo"],
    "dateRange": {
      "start": "2025-09-01T00:00:00Z",
      "end": "2025-09-30T23:59:59Z"
    }
  },
  "tolerance": 0.02
}
```

### Step 6: Validate Fixture

Run contract test against the new fixture:

```bash
# Enable contract tests for validation
export DAILY_USAGE_CONTRACT_FIXTURES_READY=true
export DAILY_USAGE_CONTRACT_FIXTURES_DIR=audit/golden-fixtures/daily-usage
export DAILY_USAGE_CONTRACT_EXPECTED_TOTALS_DIR=audit/golden-fixtures/expected-totals
export DAILY_USAGE_CONTRACT_EXPECTED_TOLERANCE=0.02

# Run contract test
tsx tests/usageFetcherContract.test.ts 2>&1 | tee audit/golden-fixtures/test-run-logs/$(date -u +%Y%m%dT%H%M%SZ)-validation.log
```

**Expected Output**:
```
[usageFetcherContractTest] ✓ All N fixtures passed contract assertions
```

**If Failures Occur**:
1. Review test output for specific assertion failures
2. Check if sanitization corrupted required fields
3. Verify expected totals match actual data
4. Re-capture if fixture is fundamentally flawed

### Step 7: Document Capture

Update capture log with results:

```bash
# Log capture completion
echo "## Capture $(date -u +%Y-%m-%d)" >> audit/golden-fixtures/CAPTURE_LOG.md
echo "- Tenant: [name]" >> audit/golden-fixtures/CAPTURE_LOG.md
echo "- Fixture: tenant-[name]-[date].json" >> audit/golden-fixtures/CAPTURE_LOG.md
echo "- Events: [count]" >> audit/golden-fixtures/CAPTURE_LOG.md
echo "- Validation: PASSED" >> audit/golden-fixtures/CAPTURE_LOG.md
echo "" >> audit/golden-fixtures/CAPTURE_LOG.md
```

### Step 8: Commit Fixtures

Prepare for version control:

```bash
# Add sanitized fixtures (NEVER commit raw fixtures)
git add audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
git add audit/golden-fixtures/expected-totals/tenant-[name]-[date].expected.json
git add audit/golden-fixtures/test-run-logs/[timestamp]-validation.log
git add audit/golden-fixtures/CAPTURE_LOG.md

# DO NOT add raw fixtures
echo "audit/golden-fixtures/raw/" >> .gitignore

# Commit
git commit -m "feat: add golden fixture for [tenant-name] daily usage

- Captured [count] events spanning [date-range]
- Sanitized with deterministic hashing
- Validated against expected totals (tolerance: 2%)
- Contract tests passing

See audit/golden-fixtures/CAPTURE_LOG.md for details"
```

## Post-Capture Integration

### Update Confidence Scores

After capturing and validating fixtures, update confidence in `memorybank/daily_usage_alignment_plan.md`:

**Workstream 3: Per-Day Fetch Loop & Metadata Capture**
- Update "Confidence Target" from 7/10 → 8/10 (or 9/10 if 3+ fixtures)
- Document fixture count and coverage in confidence notes

### Enable CI Contract Tests

Add to CI workflow (`.github/workflows/test.yml`):

```yaml
- name: Run Contract Tests
  env:
    DAILY_USAGE_CONTRACT_FIXTURES_READY: true
  run: npm test
```

### Update Documentation

Reference fixtures in relevant docs:
- `docs-site/docs/architecture/usage-ingestion-pipeline.md` - Link to golden fixtures as validation evidence
- `docs-site/docs/operations/daily-usage-cron-runbook.md` - Reference fixture-based testing

## Fixture Maintenance

### Refresh Cadence
- **Quarterly**: Capture new fixtures to detect API drift
- **After Major Changes**: Re-capture when ingestion logic changes significantly
- **API Version Updates**: Capture fixtures with new API versions

### Staleness Detection

Monitor fixture freshness:

```bash
# Find fixtures older than 6 months
find audit/golden-fixtures/daily-usage -name "*.json" -mtime +180

# Alert if fixtures are stale
# Add to CI or cron monitoring
```

### Fixture Rotation

When rotating fixtures:
1. Capture new fixtures using current workflow
2. Validate new fixtures pass contract tests
3. Run both old and new fixtures in parallel for 1 sprint
4. Archive old fixtures to `audit/golden-fixtures/archived/`
5. Update expected totals references
6. Document rotation in `CAPTURE_LOG.md`

## Troubleshooting

### Capture Issues

**Problem**: Admin API returns empty data
```bash
# Solution: Verify date range has activity
tsx scripts/admin-usage-sample.ts --start-date 2025-09-01 --end-date 2025-09-30
```

**Problem**: Rate limiting during capture
```bash
# Solution: Add delays between requests
# Edit scripts/admin-usage-sample.ts to add throttling
```

### Sanitization Issues

**Problem**: Sanitization corrupts JSON structure
```bash
# Solution: Validate JSON after sanitization
jq empty audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
```

**Problem**: Required fields are removed
```bash
# Solution: Verify sanitization preserves required fields
jq '.data[0] | keys' audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
# Should include: project_id, model, input_tokens, output_tokens, window_start, window_end
```

### Validation Issues

**Problem**: Contract test fails on dedupe assertion
```bash
# Solution: Check for actual duplicates in fixture
jq '.data | group_by(.project_id + .model + .window_start) | map(select(length > 1))' \
  audit/golden-fixtures/daily-usage/tenant-[name]-[date].json
```

**Problem**: Expected totals mismatch
```bash
# Solution: Regenerate expected totals from actual data
tsx scripts/summarize-daily-usage-fixture.ts \
  audit/golden-fixtures/daily-usage/tenant-[name]-[date].json \
  --generate-expected
```

## Best Practices

### Fixture Diversity
- Capture fixtures from different time periods (high/low usage)
- Include fixtures with various model types
- Ensure coverage of edge cases (zero tokens, high cached ratio, etc.)

### Security
- **NEVER** commit raw, unsanitized fixtures
- Review sanitized fixtures for leaked PII before committing
- Use consistent hashing salt to maintain referential integrity

### Documentation
- Always fill out capture template with context
- Link fixtures to related audit artefacts (rehearsals, diffs)
- Document any anomalies or special characteristics

### Testing
- Run contract tests locally before committing
- Validate expected totals against multiple sources
- Keep test run logs for audit trail

## Related Artefacts

- **Raw Fixtures**: `audit/golden-fixtures/raw/` (gitignored)
- **Sanitized Fixtures**: `audit/golden-fixtures/daily-usage/`
- **Expected Totals**: `audit/golden-fixtures/expected-totals/`
- **Test Run Logs**: `audit/golden-fixtures/test-run-logs/`
- **Capture Log**: `audit/golden-fixtures/CAPTURE_LOG.md`
- **Templates**: `audit/golden-fixtures/capture-template.md`, `expected-totals-template.json`

---

**Last Updated**: 2025-11-09
**Owner**: Engineering Team
**Review Cadence**: Quarterly or after major ingestion changes
