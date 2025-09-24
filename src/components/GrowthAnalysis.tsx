'use client';

import React from 'react';
import { calculateUsageGrowth } from '../lib/csv-export';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface GrowthAnalysisProps {
  events: UsageEvent[];
  className?: string;
}

export default function GrowthAnalysis({ events, className }: GrowthAnalysisProps) {
  const growth = calculateUsageGrowth(events);

  const formatGrowth = (value: number): { text: string; color: string; icon: string } => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    return {
      text: `${isPositive ? '+' : ''}${value.toFixed(1)}%`,
      color: isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600',
      icon: isPositive ? '↗' : isNegative ? '↘' : '→'
    };
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const tokensGrowth = formatGrowth(growth.growth.tokens);
  const costGrowth = formatGrowth(growth.growth.cost);
  const requestsGrowth = formatGrowth(growth.growth.requests);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className || ''}`}>
      <h2 className="text-xl font-semibold mb-6 text-gray-800">30-Day Growth Analysis</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Token Usage Growth */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Token Usage</h3>
            <span className="text-xl">{tokensGrowth.icon}</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(growth.currentPeriod.tokens)}
            </div>
            <div className={`text-sm font-medium ${tokensGrowth.color}`}>
              {tokensGrowth.text} vs last 30 days
            </div>
            <div className="text-xs text-gray-500">
              Previous: {formatNumber(growth.previousPeriod.tokens)} tokens
            </div>
          </div>
        </div>

        {/* Cost Growth */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Total Cost</h3>
            <span className="text-xl">{costGrowth.icon}</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              ${growth.currentPeriod.cost.toFixed(2)}
            </div>
            <div className={`text-sm font-medium ${costGrowth.color}`}>
              {costGrowth.text} vs last 30 days
            </div>
            <div className="text-xs text-gray-500">
              Previous: ${growth.previousPeriod.cost.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Requests Growth */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">API Requests</h3>
            <span className="text-xl">{requestsGrowth.icon}</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-gray-900">
              {formatNumber(growth.currentPeriod.requests)}
            </div>
            <div className={`text-sm font-medium ${requestsGrowth.color}`}>
              {requestsGrowth.text} vs last 30 days
            </div>
            <div className="text-xs text-gray-500">
              Previous: {formatNumber(growth.previousPeriod.requests)} requests
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Insights</h4>
        <div className="space-y-1 text-sm text-gray-600">
          {growth.growth.cost > 20 && (
            <div className="flex items-center gap-2">
              <span className="text-amber-500">⚠</span>
              <span>High cost increase detected - consider optimizing usage</span>
            </div>
          )}
          {growth.growth.tokens > 50 && growth.growth.cost < 10 && (
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Efficient scaling - token usage growing faster than costs</span>
            </div>
          )}
          {growth.currentPeriod.requests === 0 && (
            <div className="flex items-center gap-2">
              <span className="text-blue-500">ℹ</span>
              <span>No recent usage - consider setting up automated monitoring</span>
            </div>
          )}
          {growth.growth.requests > 0 && Math.abs(growth.growth.cost - growth.growth.requests) < 5 && (
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Consistent usage pattern - costs scaling proportionally with requests</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}