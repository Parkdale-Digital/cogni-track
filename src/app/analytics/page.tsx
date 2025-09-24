import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '../../lib/database';
import { usageEvents, providerKeys } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import UsageSummary from '../../components/UsageSummary';
import UsageChart from '../../components/UsageChart';
import RefreshButton from '../../components/RefreshButton';
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

interface UsageDataPoint {
  date: string;
  tokens: number;
  cost: number;
}

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

function processChartData(events: UsageEvent[]): { tokens: UsageDataPoint[]; cost: UsageDataPoint[] } {
  // Group events by date
  const dailyData = events.reduce((acc, event) => {
    const date = new Date(event.timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { tokens: 0, cost: 0 };
    }
    acc[date].tokens += (event.tokensIn || 0) + (event.tokensOut || 0);
    acc[date].cost += parseFloat(event.costEstimate || '0');
    return acc;
  }, {} as Record<string, { tokens: number; cost: number }>);

  // Convert to chart format and sort by date
  const chartData = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      tokens: data.tokens,
      cost: data.cost,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    tokens: chartData,
    cost: chartData,
  };
}

// Removed fetchUsageData - now using server actions

export default async function AnalyticsPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const events = await getUsageData(userId);
  const chartData = processChartData(events);
  
  // Bind server action with specific parameters
  const refresh7Days = refreshUsageData.bind(null, 7);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-gray-600 mt-2">Monitor your LLM API usage and costs</p>
          </div>
          <div className="flex space-x-4">
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

        {/* Usage Summary */}
        <div className="mb-8">
          <UsageSummary events={events} />
        </div>

        {/* Charts */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <UsageChart data={chartData.tokens} type="tokens" />
            <UsageChart data={chartData.cost} type="cost" />
          </div>
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

        {/* Recent Events Table */}
        {events.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Recent Usage Events</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.slice(0, 20).map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {event.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(event.tokensIn || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(event.tokensOut || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${parseFloat(event.costEstimate || '0').toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}