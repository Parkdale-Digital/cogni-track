import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { fetchAndStoreUsageForUser } from '../../../lib/usage-fetcher';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const daysBack = body.daysBack || 1; // Default to 1 day

    // Validate daysBack parameter
    if (typeof daysBack !== 'number' || daysBack < 1 || daysBack > 30) {
      return NextResponse.json({ 
        error: 'daysBack must be a number between 1 and 30' 
      }, { status: 400 });
    }

    // Fetch and store usage data
    await fetchAndStoreUsageForUser(userId, daysBack);

    return NextResponse.json({ 
      success: true, 
      message: `Usage data fetched for ${daysBack} day(s)` 
    });
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch usage data' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Import database dependencies
    const { db } = await import('../../../lib/database');
    const { usageEvents, providerKeys } = await import('../../../db/schema');
    const { eq, desc } = await import('drizzle-orm');

    // Fetch usage events for the user
    const events = await db
      .select({
        id: usageEvents.id,
        model: usageEvents.model,
        tokensIn: usageEvents.tokensIn,
        tokensOut: usageEvents.tokensOut,
        costEstimate: usageEvents.costEstimate,
        timestamp: usageEvents.timestamp,
        provider: providerKeys.provider,
      })
      .from(usageEvents)
      .innerJoin(providerKeys, eq(usageEvents.keyId, providerKeys.id))
      .where(eq(providerKeys.userId, userId))
      .orderBy(desc(usageEvents.timestamp))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching usage events:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch usage events' 
    }, { status: 500 });
  }
}