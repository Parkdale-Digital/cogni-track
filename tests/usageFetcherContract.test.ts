import assert from 'node:assert/strict';
import path from 'node:path';

import {
  loadDailyUsageFixturesFromDirectory,
  normalizeFixtureEvents,
} from './helpers/dailyUsageFixture';

const fixturesReady = process.env.DAILY_USAGE_CONTRACT_FIXTURES_READY === 'true';
const fixturesDirEnv = process.env.DAILY_USAGE_CONTRACT_FIXTURES_DIR;

async function main() {
  if (!fixturesReady) {
    console.warn(
      '[usageFetcherContractTest] Skipping daily usage contract tests – populate fixtures under audit/golden-fixtures/daily-usage/ and rerun with DAILY_USAGE_CONTRACT_FIXTURES_READY=true.'
    );
    return;
  }

  const fixturesDirectory = fixturesDirEnv
    ? path.resolve(fixturesDirEnv)
    : path.resolve(__dirname, '../audit/golden-fixtures/daily-usage');

  const fixtures = await loadDailyUsageFixturesFromDirectory(fixturesDirectory);
  if (fixtures.length === 0) {
    throw new Error(
      `[usageFetcherContractTest] No fixtures found in ${fixturesDirectory}. Follow audit/golden-fixtures/README.md before enabling contract tests.`
    );
  }

  for (const fixture of fixtures) {
    const events = normalizeFixtureEvents(fixture);
    assert(Array.isArray(events), `Fixture ${fixture.filePath} did not normalize to events array`);
    assert(events.length > 0, `Fixture ${fixture.filePath} produced zero usage events`);
  }

  // TODO(codex): Implement contract replay assertions.
  throw new Error(
    'Daily usage contract tests are not yet implemented. See memorybank/daily_usage_alignment_plan.md Workstream 3.'
  );
}

main()
  .then(() => {
    if (fixturesReady) {
      console.log('[usageFetcherContractTest] Contract test scaffolding executed');
    }
  })
  .catch((error) => {
    console.error('[usageFetcherContractTest] Failed', error);
    process.exitCode = 1;
  });

export const usageFetcherContractTestsInitialized = fixturesReady;
