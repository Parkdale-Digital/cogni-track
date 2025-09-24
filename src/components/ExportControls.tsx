'use client';

import React, { useState } from 'react';
import { exportUsageToCSV, exportUsageSummaryToCSV } from '../lib/csv-export';

interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface ExportControlsProps {
  events: UsageEvent[];
  className?: string;
}

export default function ExportControls({ events, className }: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportRawData = async () => {
    setIsExporting(true);
    try {
      const result = exportUsageToCSV(events);
      console.log(`Exported ${result.recordsExported} records to ${result.filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = async () => {
    setIsExporting(true);
    try {
      const result = exportUsageSummaryToCSV(events);
      console.log(`Exported ${result.recordsExported} summary records to ${result.filename}`);
    } catch (error) {
      console.error('Summary export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className || ''}`}>
      <button
        onClick={handleExportRawData}
        disabled={isExporting || events.length === 0}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export Raw Data'}
      </button>
      
      <button
        onClick={handleExportSummary}
        disabled={isExporting || events.length === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting...' : 'Export Summary'}
      </button>
      
      {events.length === 0 && (
        <p className="text-sm text-gray-500 self-center">
          No data available for export
        </p>
      )}
    </div>
  );
}