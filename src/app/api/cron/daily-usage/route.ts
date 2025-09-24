import { NextRequest, NextResponse } from 'next/server';
import { fetchAndStoreUsageForUser } from '../../../../lib/usage-fetcher';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // Process each user
    for (const user of allUsers) {
      try {
        await fetchAndStoreUsageForUser(user.id, 1); // Fetch last 1 day
        successCount++;
        console.log(`Successfully processed user ${user.id}`);
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