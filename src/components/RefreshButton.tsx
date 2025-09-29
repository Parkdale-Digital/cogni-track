'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface RefreshButtonProps {
  onRefresh?: () => Promise<any>;
  children: React.ReactNode;
  className?: string;
}

export default function RefreshButton({ onRefresh, children, className }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleClick = async () => {
    if (!onRefresh) return;
    
    setIsLoading(true);
    try {
      const result = await onRefresh();
      if (result?.success) {
        toast({
          title: 'Usage data refreshed',
          description: result?.message ?? 'Latest usage has been ingested.',
        });

        const issues = result?.telemetry?.issues ?? [];
        if (issues.length > 0) {
          toast({
            title: 'Provider warnings',
            description: `${issues.length} issue${issues.length > 1 ? 's' : ''} reported during ingestion. Check logs for details.`,
            variant: 'destructive',
          });
        }
      }
      router.refresh();
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Failed to refresh usage data',
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleClick}
      disabled={isLoading}
      className={className || "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
