'use client';

import React, { useState, useEffect } from 'react';

interface FilterOptions {
  dateRange: {
    start: string;
    end: string;
  };
  providers: string[];
  models: string[];
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  availableProviders: string[];
  availableModels: string[];
  className?: string;
}

export default function AdvancedFilters({ 
  onFiltersChange, 
  availableProviders, 
  availableModels, 
  className 
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: '',
      end: ''
    },
    providers: [],
    models: []
  });

  // Set default date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }));
  }, []);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleProviderToggle = (provider: string) => {
    setFilters(prev => ({
      ...prev,
      providers: prev.providers.includes(provider)
        ? prev.providers.filter(p => p !== provider)
        : [...prev.providers, provider]
    }));
  };

  const handleModelToggle = (model: string) => {
    setFilters(prev => ({
      ...prev,
      models: prev.models.includes(model)
        ? prev.models.filter(m => m !== model)
        : [...prev.models, model]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: {
        start: '',
        end: ''
      },
      providers: [],
      models: []
    });
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
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
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
                      filters.providers.includes(provider)
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
                      filters.models.includes(model)
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
          {activeFiltersCount > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}