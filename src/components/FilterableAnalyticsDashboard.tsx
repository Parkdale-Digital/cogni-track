'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import UsageSummary from './UsageSummary';
import UsageChart from './UsageChart';
import ExportControls from './ExportControls';
import AdvancedFilters from './AdvancedFilters';
import GrowthAnalysis from './GrowthAnalysis';
import CostAlerts from './CostAlerts';
import DataAggregation from './DataAggregation';

import ClientOnlyTimestamp from './ClientOnlyTimestamp';

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

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  providers: string[];
  models: string[];
}

const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

interface FilterableAnalyticsDashboardProps {
  events: UsageEvent[];
  availableProviders: string[];
  availableModels: string[];
}

export default function FilterableAnalyticsDashboard({
  events,
  availableProviders,
  availableModels
}: FilterableAnalyticsDashboardProps) {
  const defaultFiltersRef = useRef<FilterOptions>({
    dateRange: getDefaultDateRange(),
    providers: [],
    models: []
  });

  const [filters, setFilters] = useState<FilterOptions>(() => ({
    dateRange: { ...defaultFiltersRef.current.dateRange },
    providers: [...defaultFiltersRef.current.providers],
    models: [...defaultFiltersRef.current.models]
  }));

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(event => new Date(event.timestamp) >= startDate);
    }

    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => new Date(event.timestamp) <= endDate);
    }

    if (filters.providers.length > 0) {
      filtered = filtered.filter(event => filters.providers.includes(event.provider));
    }

    if (filters.models.length > 0) {
      filtered = filtered.filter(event => filters.models.includes(event.model));
    }

    return filtered;
  }, [events, filters]);

  // Process chart data from filtered events
  const chartData = useMemo(() => {
    const dailyData = filteredEvents.reduce((acc, event) => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { tokens: 0, cost: 0 };
      }
      acc[date].tokens += (event.tokensIn || 0) + (event.tokensOut || 0);
      acc[date].cost += parseFloat(event.costEstimate || '0');
      return acc;
    }, {} as Record<string, { tokens: number; cost: number }>);

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
  }, [filteredEvents]);

  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters({
      dateRange: { ...newFilters.dateRange },
      providers: [...newFilters.providers],
      models: [...newFilters.models]
    });
  }, []);

  const resetFilters = useCallback(() => {
    const defaults = defaultFiltersRef.current;
    handleFiltersChange({
      dateRange: { ...defaults.dateRange },
      providers: [...defaults.providers],
      models: [...defaults.models]
    });
  }, [handleFiltersChange]);

  const activeFiltersCount = useMemo(() => {
    const defaults = defaultFiltersRef.current;
    let count = 0;

    if (filters.dateRange.start !== defaults.dateRange.start) {
      count++;
    }

    if (filters.dateRange.end !== defaults.dateRange.end) {
      count++;
    }

    count += filters.providers.length;
    count += filters.models.length;

    return count;
  }, [filters]);

  const hasFilteredEvents = filteredEvents.length > 0;
  const hasFiltersApplied = activeFiltersCount > 0;
  const overviewHeadingId = 'analytics-overview';
  const trendsHeadingId = 'analytics-trends';
  const filtersHeadingId = 'analytics-filters';
  const alertsHeadingId = 'analytics-alerts';
  const drilldownHeadingId = 'analytics-drilldown';

  return (
    <div className="space-y-10">
      <section aria-labelledby={overviewHeadingId} className="space-y-4">
        <div className="space-y-1">
          <h2 id={overviewHeadingId} className="text-2xl font-semibold tracking-tight">
            Usage overview
          </h2>
          <p className="text-sm text-muted-foreground">
            Totals update as you refine the filters below, helping you validate spikes at a glance.
          </p>
        </div>
        <UsageSummary events={filteredEvents} />
      </section>

      <section aria-labelledby={trendsHeadingId} className="space-y-4">
        <div className="space-y-1">
          <h2 id={trendsHeadingId} className="text-2xl font-semibold tracking-tight">
            Usage trends
          </h2>
          <p className="text-sm text-muted-foreground">
            Token and cost charts respect the date range and chip selections you apply.
          </p>
        </div>
        {hasFilteredEvents ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <UsageChart data={chartData.tokens} type="tokens" />
            <UsageChart data={chartData.cost} type="cost" />
          </div>
        ) : hasFiltersApplied ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">No data matches your current filters</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Expand the date range or clear provider/model chips to see usage trends again.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-foreground">Usage charts will appear once we have activity</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Refresh usage or add API keys to start collecting trend data.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby={filtersHeadingId} className="space-y-4">
        <div className="space-y-1">
          <h2 id={filtersHeadingId} className="text-2xl font-semibold tracking-tight">
            Advanced filtering
          </h2>
          <p className="text-sm text-muted-foreground">
            Narrow by provider, model, or timeframe before exporting or drilling into anomalies.
          </p>
        </div>
        {hasFiltersApplied && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active.</span>{' '}
              Showing {filteredEvents.length} of {events.length} events.
            </div>
            <button
              onClick={resetFilters}
              className="inline-flex items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm font-medium text-primary underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Clear all filters
            </button>
          </div>
        )}
        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableProviders={availableProviders}
          availableModels={availableModels}
        />
      </section>

      <section aria-labelledby={alertsHeadingId} className="space-y-4">
        <div className="space-y-1">
          <h2 id={alertsHeadingId} className="text-2xl font-semibold tracking-tight">
            Alerts & anomalies
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep anomalies visible without overwhelming neutral data presentations.
          </p>
        </div>
        <CostAlerts events={filteredEvents} />
        {hasFilteredEvents && <GrowthAnalysis events={filteredEvents} />}
      </section>

      {hasFilteredEvents && (
        <section aria-labelledby={drilldownHeadingId} className="space-y-4">
          <div className="space-y-1">
            <h2 id={drilldownHeadingId} className="text-2xl font-semibold tracking-tight">
              Reports & exports
            </h2>
            <p className="text-sm text-muted-foreground">
              Export the current slice of data or review recent events for deeper investigation.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium">Export data</h3>
                <p className="text-sm text-muted-foreground">
                  {hasFiltersApplied
                    ? `Download ${filteredEvents.length.toLocaleString()} filtered events`
                    : `Download all ${events.length.toLocaleString()} events`}
                </p>
              </div>
              <ExportControls events={filteredEvents} />
            </div>
          </div>
          <DataAggregation events={filteredEvents} />
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold">
                Recent usage events
                {hasFiltersApplied && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (filtered: {filteredEvents.length})
                  </span>
                )}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tokens in
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tokens out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-6 py-4 text-sm text-foreground">
                        <ClientOnlyTimestamp timestamp={event.timestamp} />
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        <span className="inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                          {event.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{event.model}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {(event.tokensIn || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {(event.tokensOut || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        ${parseFloat(event.costEstimate || '0').toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
