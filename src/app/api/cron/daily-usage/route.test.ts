import assert from 'node:assert/strict';
import { test } from 'node:test';

test('GET aggregates warningCount across user telemetry issues', async () => {
  process.env.CRON_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgresql://user:password@localhost/db';

  const { createDailyUsageHandler } = await import('./route');

  const fakeUsers = [
    { id: 'user-1' },
    { id: 'user-2' },
    { id: 'user-3' },
  ];

  const telemetryByUser = new Map<string, { issues: Array<{ message: string }> }>([
    ['user-1', { issues: [{ message: 'issue-a' }] }],
    ['user-2', { issues: [{ message: 'issue-b' }, { message: 'issue-c' }] }],
    ['user-3', { issues: [] }],
  ]);

  const handler = createDailyUsageHandler({
    fetchAndStoreUsageForUser: async (userId: string) => ({
      userId,
      processedKeys: 0,
      simulatedKeys: 0,
      failedKeys: 0,
      storedEvents: 0,
      skippedEvents: 0,
      issues: telemetryByUser.get(userId)?.issues ?? [],
    }),
    loadDatabase: async () => ({
      db: {
        select: () => ({
          from: async () => fakeUsers,
        }),
      },
      users: { id: 'id' } as any,
    }),
  });

  const request = { headers: new Headers({ authorization: 'Bearer test-secret' }) } as any;
  const response = await handler(request);
  const payload = await response.json();

  const expectedWarningCount = [...telemetryByUser.values()].reduce(
    (sum, telemetry) => sum + telemetry.issues.length,
    0
  );

  assert.equal(payload.warningCount, expectedWarningCount);
  assert.deepEqual(
    (payload.warnings as Array<{ userId: string }>).map((entry) => entry.userId).sort(),
    ['user-1', 'user-2']
  );
});
