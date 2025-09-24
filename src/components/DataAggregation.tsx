'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface AggregatedData {
  period: string;
  requests: number;
  tokens: number;
  cost: number;
  providers: Record<string, number>;
  models: Record<string, number>;
}

interface DataAggregationProps {
  events: UsageEvent[];
  className?: string;
}

export default function DataAggregation({ events, className }: DataAggregationProps) {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [viewType, setViewType] = useState<'overview' | 'breakdown'>('overview');

  const aggregateData = (groupBy: 'weekly' | 'monthly'): AggregatedData[] => {
    const groups: Record<string, AggregatedData> = {};

    events.forEach(event => {
      const date = new Date(event.timestamp);
      let periodKey: string;

      if (groupBy === 'weekly') {
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        periodKey = startOfWeek.toISOString().split('T')[0];
      } else {
        // Get the start of the month
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups[periodKey]) {
        groups[periodKey] = {
          period: periodKey,
          requests: 0,
          tokens: 0,
          cost: 0,
          providers: {},
          models: {}
        };
      }

      const group = groups[periodKey];
      group.requests++;
      group.tokens += (event.tokensIn || 0) + (event.tokensOut || 0);
      group.cost += parseFloat(event.costEstimate || '0');
      
      // Track providers
      if (!group.providers[event.provider]) {
        group.providers[event.provider] = 0;
      }
      group.providers[event.provider]++;

      // Track models
      if (!group.models[event.model]) {
        group.models[event.model] = 0;
      }
      group.models[event.model]++;
    });

    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
  };

  const formatPeriod = (period: string, groupBy: 'weekly' | 'monthly'): string => {
    if (groupBy === 'weekly') {
      const date = new Date(period);
      const endDate = new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      const [year, month] = period.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const aggregatedData = aggregateData(timeframe);
  const chartData = aggregatedData.map(item => ({
    period: formatPeriod(item.period, timeframe),
    requests: item.requests,
    tokens: item.tokens,
    cost: parseFloat(item.cost.toFixed(2))
  }));

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Usage Reports</h2>
            <p className="text-sm text-gray-600">Aggregated data for {timeframe} analysis</p>
          </div>
          
          <div className="flex gap-2">
            {/* Timeframe Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeframe('weekly')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeframe === 'weekly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTimeframe('monthly')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeframe === 'monthly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
            </div>

            {/* View Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('overview')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'overview' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setViewType('breakdown')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  viewType === 'breakdown' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Breakdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {aggregatedData.length > 0 ? (
        <div className="p-4">
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="period" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickFormatter={formatNumber}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'cost' ? `$${value.toFixed(2)}` : formatNumber(value),
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Legend />
                <Bar dataKey="requests" fill="#3b82f6" name="Requests" />
                <Bar dataKey="tokens" fill="#10b981" name="Tokens" />
                <Bar dataKey="cost" fill="#f59e0b" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table */}
          {viewType === 'breakdown' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requests
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tokens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Model
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregatedData.map((item) => {
                    const topProvider = Object.entries(item.providers).sort(([,a], [,b]) => b - a)[0];
                    const topModel = Object.entries(item.models).sort(([,a], [,b]) => b - a)[0];
                    
                    return (
                      <tr key={item.period} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPeriod(item.period, timeframe)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.requests.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(item.tokens)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {topProvider ? `${topProvider[0]} (${topProvider[1]})` : '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {topModel ? `${topModel[0]} (${topModel[1]})` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-gray-500 mb-2">No data available</div>
          <div className="text-sm text-gray-400">
            Usage data will appear here once you have API activity
          </div>
        </div>
      )}
    </div>
  );
}