import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreUsageForUser } from '../../../../lib/usage-fetcher';

type DatabaseModule = typeof import('../../../../lib/database');
type SchemaModule = typeof import('../../../../db/schema');

type DailyUsageDependencies = {
  fetchAndStoreUsageForUser: typeof fetchAndStoreUsageForUser;
  loadDatabase: () => Promise<{
    db: Pick<DatabaseModule['db'], 'select'>;
    users: SchemaModule['users'];
  }>;
};

export function createDailyUsageHandler({
  fetchAndStoreUsageForUser: fetchUsage,
  loadDatabase,
}: DailyUsageDependencies) {
  return async function GET(request: NextRequest) {
    try {
      // Verify this is a legitimate cron request
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      console.log('Starting daily usage fetch cron job');

      // Import database dependencies
      const { db, users } = await loadDatabase();

      // Get all users in the system
      const allUsers = await db.select({ id: users.id }).from(users);

      console.log(`Found ${allUsers.length} users to process`);

      let successCount = 0;
      let errorCount = 0;
      let warningCount = 0;
      const warnings: Array<{ userId: string; issues: number }> = [];

      // Process each user
      for (const user of allUsers) {
        try {
          const telemetry = await fetchUsage(user.id, 1); // Fetch last 1 day
          successCount++;
          if (telemetry.issues.length > 0) {
            warnings.push({ userId: user.id, issues: telemetry.issues.length });
            warningCount += telemetry.issues.length;
            console.warn(
              `Usage ingestion completed with ${telemetry.issues.length} issues for user ${user.id}`,
              telemetry
            );
          } else {
            console.log(`Successfully processed user ${user.id}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`Error processing user ${user.id}:`, error);
        }
      }

      const result = {
        success: true,
        processed: allUsers.length,
        successful: successCount,
        errors: errorCount,
        warningCount,
        warnings,
        timestamp: new Date().toISOString(),
      };

      console.log('Daily usage fetch completed:', result);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in daily usage cron job:', error);
      return NextResponse.json({
        error: 'Failed to run daily usage fetch',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  };
}

export const GET = createDailyUsageHandler({
  fetchAndStoreUsageForUser,
  loadDatabase: async () => {
    const { db } = await import('../../../../lib/database');
    const { users } = await import('../../../../db/schema');
    return { db, users };
  },
});
