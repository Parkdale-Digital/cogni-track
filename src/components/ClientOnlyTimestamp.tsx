'use client';

import { useState, useEffect } from 'react';

interface ClientOnlyTimestampProps {
  timestamp: string;
}

export default function ClientOnlyTimestamp({ timestamp }: ClientOnlyTimestampProps) {
  const [formattedTimestamp, setFormattedTimestamp] = useState('');

  useEffect(() => {
    setFormattedTimestamp(new Date(timestamp).toLocaleString());
  }, [timestamp]);

  if (!formattedTimestamp) {
    return null; // Or a loading skeleton
  }

  return <>{formattedTimestamp}</>;
}
