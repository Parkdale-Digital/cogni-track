'use server';

import { auth } from '@clerk/nextjs/server';
import { fetchAndStoreUsageForUser } from '../../lib/usage-fetcher';

export async function refreshUsageData(daysBack: number = 7) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    const telemetry = await fetchAndStoreUsageForUser(userId, daysBack);
    return {
      success: true,
      message: `Usage data refreshed for ${daysBack} day(s)`,
      telemetry,
    };
  } catch (error) {
    console.error('Error refreshing usage data:', error);
    const message = error instanceof Error ? error.message : 'Failed to refresh usage data';
    throw new Error(message);
  }
}
