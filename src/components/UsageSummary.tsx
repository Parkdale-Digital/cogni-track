'use client';

import React from 'react';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface UsageSummaryProps {
  events: UsageEvent[];
}

export default function UsageSummary({ events }: UsageSummaryProps) {
  // Calculate summary statistics
  const totalEvents = events.length;
  const totalTokensIn = events.reduce((sum, event) => sum + (event.tokensIn || 0), 0);
  const totalTokensOut = events.reduce((sum, event) => sum + (event.tokensOut || 0), 0);
  const totalCost = events.reduce((sum, event) => sum + parseFloat(event.costEstimate || '0'), 0);

  // Get unique models
  const uniqueModels = Array.from(new Set(events.map(event => event.model)));

  // Get usage by provider
  const providerStats = events.reduce((acc, event) => {
    if (!acc[event.provider]) {
      acc[event.provider] = { events: 0, cost: 0 };
    }
    acc[event.provider].events++;
    acc[event.provider].cost += parseFloat(event.costEstimate || '0');
    return acc;
  }, {} as Record<string, { events: number; cost: number }>);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Usage Summary</h2>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{totalEvents}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{formatNumber(totalTokensIn)}</div>
          <div className="text-sm text-gray-600">Input Tokens</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{formatNumber(totalTokensOut)}</div>
          <div className="text-sm text-gray-600">Output Tokens</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">${totalCost.toFixed(4)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
      </div>

      {/* Provider Breakdown */}
      {Object.keys(providerStats).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-700">Usage by Provider</h3>
          <div className="space-y-2">
            {Object.entries(providerStats).map(([provider, stats]) => (
              <div key={provider} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="font-medium capitalize">{provider}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.events} requests</div>
                  <div className="text-xs text-gray-600">${stats.cost.toFixed(4)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Models Used */}
      {uniqueModels.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 text-gray-700">Models Used</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueModels.map((model) => (
              <span
                key={model}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      )}

      {totalEvents === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No usage data available</div>
          <div className="text-sm text-gray-400">
            Add your API keys and fetch usage data to see analytics
          </div>
        </div>
      )}
    </div>
  );
}