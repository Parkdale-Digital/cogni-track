'use client';

import React, { useState, useMemo } from 'react';
import UsageSummary from './UsageSummary';
import UsageChart from './UsageChart';
import ExportControls from './ExportControls';
import AdvancedFilters from './AdvancedFilters';
import GrowthAnalysis from './GrowthAnalysis';
import CostAlerts from './CostAlerts';
import DataAggregation from './DataAggregation';

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
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: { start: '', end: '' },
    providers: [],
    models: []
  });

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Apply date range filter
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(event => new Date(event.timestamp) >= startDate);
    }

    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(event => new Date(event.timestamp) <= endDate);
    }

    // Apply provider filter
    if (filters.providers.length > 0) {
      filtered = filtered.filter(event => filters.providers.includes(event.provider));
    }

    // Apply model filter
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

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const activeFiltersCount = 
    (filters.dateRange.start ? 1 : 0) +
    (filters.dateRange.end ? 1 : 0) +
    filters.providers.length +
    filters.models.length;

  return (
    <>
      {/* Filter Info */}
      {activeFiltersCount > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-blue-800">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </div>
              <div className="text-sm text-blue-600">
                Showing {filteredEvents.length} of {events.length} events
              </div>
            </div>
            <button
              onClick={() => setFilters({ dateRange: { start: '', end: '' }, providers: [], models: [] })}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="mb-8">
        <AdvancedFilters 
          onFiltersChange={handleFiltersChange}
          availableProviders={availableProviders}
          availableModels={availableModels}
        />
      </div>

      {/* Cost Alerts */}
      <div className="mb-8">
        <CostAlerts events={filteredEvents} />
      </div>

      {/* Growth Analysis */}
      {filteredEvents.length > 0 && (
        <div className="mb-8">
          <GrowthAnalysis events={filteredEvents} />
        </div>
      )}

      {/* Usage Summary */}
      <div className="mb-8">
        <UsageSummary events={filteredEvents} />
      </div>

      {/* Data Aggregation Reports */}
      {filteredEvents.length > 0 && (
        <div className="mb-8">
          <DataAggregation events={filteredEvents} />
        </div>
      )}

      {/* Charts */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          <UsageChart data={chartData.tokens} type="tokens" />
          <UsageChart data={chartData.cost} type="cost" />
        </div>
      ) : activeFiltersCount > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center mb-8">
          <div className="text-gray-500 mb-2">No data matches your current filters</div>
          <div className="text-sm text-gray-400 mb-4">
            Try adjusting your date range, provider, or model filters
          </div>
          <button
            onClick={() => setFilters({ dateRange: { start: '', end: '' }, providers: [], models: [] })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center mb-8">
          <div className="text-gray-500 mb-4">No usage data available</div>
          <div className="text-sm text-gray-400 mb-6">
            Add your API keys and fetch usage data to see detailed analytics
          </div>
        </div>
      )}

      {/* Export Controls - Always available */}
      <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-800">Export Data</h3>
            <p className="text-sm text-gray-600">
              {activeFiltersCount > 0 
                ? `Export filtered data (${filteredEvents.length} events)`
                : `Export all data (${events.length} events)`
              }
            </p>
          </div>
          <ExportControls events={filteredEvents} />
        </div>
      </div>

      {/* Recent Events Table */}
      {filteredEvents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Usage Events
              {activeFiltersCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  (filtered: {filteredEvents.length})
                </span>
              )}
            </h2>
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
                {filteredEvents.slice(0, 20).map((event) => (
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
    </>
  );
}