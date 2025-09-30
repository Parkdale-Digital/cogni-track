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

  const hasEvents = events.length > 0;

  return (
    <main className="container space-y-10 py-10 lg:py-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Usage analytics</h1>
          <p className="max-w-2xl text-muted-foreground">
            Monitor spend anomalies, track token trends, and export usage snapshots without leaving your workspace.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <RefreshButton
            onRefresh={refresh7Days}
            className="inline-flex items-center justify-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            Refresh data
          </RefreshButton>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Manage keys
          </a>
        </div>
      </header>

      {hasEvents ? (
        <FilterableAnalyticsDashboard
          events={events}
          availableProviders={availableProviders}
          availableModels={availableModels}
        />
      ) : (
        <section
          aria-labelledby="analytics-empty-state-heading"
          className="rounded-lg border border-dashed border-muted-foreground/30 bg-card p-10 text-center shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 id="analytics-empty-state-heading" className="text-xl font-semibold">
                No usage data yet
              </h2>
              <p className="text-sm text-muted-foreground">
                Connect a provider key and fetch recent activity to unlock dashboards and exports.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Add API keys
              </a>
              <RefreshButton
                onRefresh={refresh7Days}
                className="inline-flex items-center justify-center rounded-md border border-border bg-muted px-5 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                Fetch usage data
              </RefreshButton>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
