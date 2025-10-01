'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    <div className={cn('flex flex-col gap-3 sm:flex-row', className)}>
      <Button
        type="button"
        onClick={handleExportRawData}
        disabled={isExporting || events.length === 0}
        className="gap-2 w-full sm:w-auto"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting…' : 'Export raw data'}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={handleExportSummary}
        disabled={isExporting || events.length === 0}
        className="gap-2 w-full sm:w-auto"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExporting ? 'Exporting…' : 'Export summary'}
      </Button>

      {events.length === 0 && (
        <p className="self-center text-sm text-muted-foreground">
          No data available for export
        </p>
      )}
    </div>
  );
}