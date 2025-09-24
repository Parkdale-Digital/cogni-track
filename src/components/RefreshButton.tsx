'use client';

import React, { useState } from 'react';

interface RefreshButtonProps {
  onRefresh?: () => Promise<any>;
  children: React.ReactNode;
  className?: string;
}

export default function RefreshButton({ onRefresh, children, className }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onRefresh) return;
    
    setIsLoading(true);
    try {
      await onRefresh();
      // Reload the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Please try again.');
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