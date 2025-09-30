import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { fetchAndStoreUsageForUser } from '../../../../lib/usage-fetcher';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      console.error('CRON_SECRET is not configured. Rejecting cron request.');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    const provided = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

    if (!provided) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expectedBuffer = Buffer.from(expectedSecret);
    const providedBuffer = Buffer.from(provided);
    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily usage fetch cron job');

    // Import database dependencies
    const { db } = await import('../../../../lib/database');
    const { users } = await import('../../../../db/schema');

    // Get all users in the system
    const allUsers = await db.select({ id: users.id }).from(users);
    
    console.log(`Found ${allUsers.length} users to process`);

    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    // Process each user
    for (const user of allUsers) {
      try {
        const telemetry = await fetchAndStoreUsageForUser(user.id, 1); // Fetch last 1 day
        successCount++;
        if (telemetry.issues.length > 0) {
          warningCount += 1;
          console.warn('Usage ingestion completed with issues', { userId: user.id, telemetry });
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
}
