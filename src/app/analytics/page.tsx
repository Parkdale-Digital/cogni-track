import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '../../lib/database';
import { usageEvents, providerKeys } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import RefreshButton from '../../components/RefreshButton';
import FilterableAnalyticsDashboard from '../../components/FilterableAnalyticsDashboard';
import { refreshUsageData } from './actions';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

// Removed UsageDataPoint interface - now handled in FilterableAnalyticsDashboard

async function getUsageData(userId: string): Promise<UsageEvent[]> {
  try {
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
      .limit(1000);

    return events.map(event => ({
      ...event,
      timestamp: event.timestamp.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return [];
  }
}

// Removed processChartData function - now handled in FilterableAnalyticsDashboard

// Removed fetchUsageData - now using server actions

export default async function AnalyticsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const events = await getUsageData(userId);
  
  // Extract unique providers and models for filtering
  const availableProviders = [...new Set(events.map(e => e.provider))];
  const availableModels = [...new Set(events.map(e => e.model))];
  
  // Bind server action with specific parameters
  const refresh7Days = refreshUsageData.bind(null, 7);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-gray-600 mt-2">Monitor your LLM API usage and costs with advanced insights and filtering</p>
          </div>
          <div className="flex gap-3">
            <RefreshButton 
              onRefresh={refresh7Days}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Data
            </RefreshButton>
            <a 
              href="/dashboard" 
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Manage Keys
            </a>
          </div>
        </div>

        {/* Filterable Analytics Dashboard */}
        {events.length > 0 ? (
          <FilterableAnalyticsDashboard 
            events={events}
            availableProviders={availableProviders}
            availableModels={availableModels}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-500 mb-4">No usage data available</div>
            <div className="text-sm text-gray-400 mb-6">
              Add your API keys and fetch usage data to see detailed analytics
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/dashboard" 
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add API Keys
              </a>
              <RefreshButton 
                onRefresh={refresh7Days}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Fetch Usage Data
              </RefreshButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}