'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  providers: string[];
  models: string[];
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  availableProviders: string[];
  availableModels: string[];
  className?: string;
}

export default function AdvancedFilters({ 
  filters,
  onFiltersChange, 
  availableProviders, 
  availableModels, 
  className 
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterOptions>(filters);
  const [actionStatus, setActionStatus] = useState<'idle' | 'applied' | 'cleared'>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    setDraftFilters(filters);
    setActionStatus('idle');
  }, [filters]);

  useEffect(() => {
    if (actionStatus === 'idle') return;

    const timer = window.setTimeout(() => {
      setActionStatus('idle');
      setLastUpdatedAt(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [actionStatus]);

  useEffect(() => {
    if (!isExpanded || lastUpdatedAt === null) return;

    const timer = window.setTimeout(() => {
      setIsExpanded(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isExpanded, lastUpdatedAt]);

  const hasPendingChanges = useMemo(() => {
    const datesMatch =
      draftFilters.dateRange.start === filters.dateRange.start &&
      draftFilters.dateRange.end === filters.dateRange.end;
    const providersMatch =
      draftFilters.providers.length === filters.providers.length &&
      draftFilters.providers.every(provider => filters.providers.includes(provider));
    const modelsMatch =
      draftFilters.models.length === filters.models.length &&
      draftFilters.models.every(model => filters.models.includes(model));

    return !(datesMatch && providersMatch && modelsMatch);
  }, [draftFilters, filters]);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setDraftFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleProviderToggle = (provider: string) => {
    setDraftFilters(prev => {
      const nextProviders = prev.providers.includes(provider)
        ? prev.providers.filter(p => p !== provider)
        : [...prev.providers, provider];

      return {
        ...prev,
        providers: nextProviders
      };
    });
  };

  const handleModelToggle = (model: string) => {
    setDraftFilters(prev => {
      const nextModels = prev.models.includes(model)
        ? prev.models.filter(m => m !== model)
        : [...prev.models, model];

      return {
        ...prev,
        models: nextModels
      };
    });
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      dateRange: {
        start: '',
        end: ''
      },
      providers: [],
      models: []
    };

    setDraftFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setActionStatus('cleared');
    setLastUpdatedAt(Date.now());
  };

  const applyFilters = () => {
    if (!hasPendingChanges) {
      setActionStatus('idle');
      return;
    }

    onFiltersChange({
      dateRange: {
        start: draftFilters.dateRange.start,
        end: draftFilters.dateRange.end
      },
      providers: [...draftFilters.providers],
      models: [...draftFilters.models]
    });
    setActionStatus('applied');
    setLastUpdatedAt(Date.now());
  };

  const activeFiltersCount = 
    (filters.dateRange.start ? 1 : 0) +
    (filters.dateRange.end ? 1 : 0) +
    filters.providers.length +
    filters.models.length;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className || ''}`}>
      <div 
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-gray-800">Advanced Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
        <svg 
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-6">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={draftFilters.dateRange.start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={draftFilters.dateRange.end}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Providers */}
          {availableProviders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Providers
              </label>
              <div className="flex flex-wrap gap-2">
                {availableProviders.map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleProviderToggle(provider)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      draftFilters.providers.includes(provider)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Models */}
          {availableModels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Models
              </label>
              <div className="flex flex-wrap gap-2">
                {availableModels.slice(0, 10).map(model => (
                  <button
                    key={model}
                    onClick={() => handleModelToggle(model)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      draftFilters.models.includes(model)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {model}
                  </button>
                ))}
                {availableModels.length > 10 && (
                  <span className="px-3 py-1 text-sm text-gray-500">
                    +{availableModels.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          <div className="pt-4 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {activeFiltersCount > 0 ? (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline text-left"
              >
                Clear all filters
              </button>
            ) : (
              <span className="text-sm text-gray-400">No filters selected</span>
            )}
            <div className="flex flex-col sm:items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={!hasPendingChanges}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  hasPendingChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Apply filters
              </button>
              <div className="min-h-[1.25rem] text-xs text-gray-500">
                {actionStatus === 'applied' && <span>Filters updated ✓</span>}
                {actionStatus === 'cleared' && <span>Filters cleared</span>}
                {actionStatus === 'idle' && !hasPendingChanges && activeFiltersCount > 0 && (
                  <span>No pending changes</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
