'use client';

import React, { useState, useEffect } from 'react';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface AlertThreshold {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  amount: number;
  enabled: boolean;
}

interface CostAlertsProps {
  events: UsageEvent[];
  className?: string;
}

export default function CostAlerts({ events, className }: CostAlertsProps) {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([
    { id: 'daily', type: 'daily', amount: 10, enabled: true },
    { id: 'weekly', type: 'weekly', amount: 50, enabled: true },
    { id: 'monthly', type: 'monthly', amount: 200, enabled: false }
  ]);
  const [showSettings, setShowSettings] = useState(false);

  // Calculate current usage for different periods
  const calculatePeriodUsage = (type: 'daily' | 'weekly' | 'monthly'): number => {
    const now = new Date();
    let startDate: Date;

    switch (type) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return events
      .filter(event => new Date(event.timestamp) >= startDate)
      .reduce((sum, event) => sum + parseFloat(event.costEstimate || '0'), 0);
  };

  const dailyUsage = calculatePeriodUsage('daily');
  const weeklyUsage = calculatePeriodUsage('weekly');
  const monthlyUsage = calculatePeriodUsage('monthly');

  const getUsageForThreshold = (threshold: AlertThreshold): number => {
    switch (threshold.type) {
      case 'daily': return dailyUsage;
      case 'weekly': return weeklyUsage;
      case 'monthly': return monthlyUsage;
    }
  };

  const getAlertStatus = (threshold: AlertThreshold): {
    status: 'safe' | 'warning' | 'danger';
    percentage: number;
    message: string;
  } => {
    if (!threshold.enabled) {
      return { status: 'safe', percentage: 0, message: 'Alert disabled' };
    }

    const usage = getUsageForThreshold(threshold);
    const percentage = (usage / threshold.amount) * 100;

    if (percentage >= 100) {
      return {
        status: 'danger',
        percentage,
        message: `Budget exceeded by $${(usage - threshold.amount).toFixed(2)}`
      };
    } else if (percentage >= 80) {
      return {
        status: 'warning',
        percentage,
        message: `${(100 - percentage).toFixed(0)}% budget remaining`
      };
    } else {
      return {
        status: 'safe',
        percentage,
        message: `${(100 - percentage).toFixed(0)}% budget remaining`
      };
    }
  };

  const updateThreshold = (id: string, updates: Partial<AlertThreshold>) => {
    setThresholds(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  };

  // Store thresholds in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('costAlertThresholds');
    if (stored) {
      try {
        setThresholds(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored thresholds:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('costAlertThresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  const activeAlerts = thresholds.filter(t => t.enabled && getAlertStatus(t).status !== 'safe');

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Cost Alerts</h2>
          <p className="text-sm text-gray-600">Monitor your spending against budget thresholds</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-red-800 mb-2">Active Alerts</h3>
          <div className="space-y-2">
            {activeAlerts.map(threshold => {
              const alert = getAlertStatus(threshold);
              const usage = getUsageForThreshold(threshold);
              return (
                <div key={threshold.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.status === 'danger' ? 'bg-red-500' : 'bg-amber-500'
                  }`}></span>
                  <span className="font-medium capitalize">{threshold.type}:</span>
                  <span>${usage.toFixed(2)} / ${threshold.amount}</span>
                  <span className="text-gray-600">({alert.message})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert Overview */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {thresholds.map(threshold => {
            const alert = getAlertStatus(threshold);
            const usage = getUsageForThreshold(threshold);
            
            return (
              <div key={threshold.id} className={`p-3 rounded-lg border-2 ${
                !threshold.enabled ? 'border-gray-200 bg-gray-50' :
                alert.status === 'danger' ? 'border-red-200 bg-red-50' :
                alert.status === 'warning' ? 'border-amber-200 bg-amber-50' :
                'border-green-200 bg-green-50'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium capitalize text-gray-800">{threshold.type}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    !threshold.enabled ? 'bg-gray-200 text-gray-600' :
                    alert.status === 'danger' ? 'bg-red-200 text-red-800' :
                    alert.status === 'warning' ? 'bg-amber-200 text-amber-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {!threshold.enabled ? 'Disabled' : alert.status}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>${usage.toFixed(2)} spent</span>
                    <span>${threshold.amount} budget</span>
                  </div>
                  
                  {threshold.enabled && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          alert.status === 'danger' ? 'bg-red-500' :
                          alert.status === 'warning' ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-600">{alert.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Alert Settings</h3>
          <div className="space-y-4">
            {thresholds.map(threshold => (
              <div key={threshold.id} className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={threshold.enabled}
                    onChange={(e) => updateThreshold(threshold.id, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium capitalize">{threshold.type}</span>
                </label>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={threshold.amount}
                    onChange={(e) => updateThreshold(threshold.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Alerts are checked in real-time based on your current usage data. 
              Daily budgets reset at midnight, weekly budgets reset on Sunday, and monthly budgets reset on the 1st.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}