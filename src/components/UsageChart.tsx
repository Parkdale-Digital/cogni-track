'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UsageDataPoint {
  date: string;
  tokens: number;
  cost: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  type: 'tokens' | 'cost';
}

export default function UsageChart({ data, type }: UsageChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  const formatTokens = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  return (
    <div className="w-full h-80 bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {type === 'tokens' ? 'Token Usage Over Time' : 'Cost Trends Over Time'}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            tickFormatter={type === 'tokens' ? formatTokens : formatCost}
            stroke="#666"
            fontSize={12}
          />
          <Tooltip 
            labelFormatter={(value) => formatDate(value as string)}
            formatter={(value: number) => [
              type === 'tokens' ? `${value.toLocaleString()} tokens` : formatCost(value),
              type === 'tokens' ? 'Tokens' : 'Cost'
            ]}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={type} 
            stroke={type === 'tokens' ? '#3b82f6' : '#10b981'}
            strokeWidth={2}
            dot={{ fill: type === 'tokens' ? '#3b82f6' : '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name={type === 'tokens' ? 'Tokens' : 'Cost ($)'}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}