interface UsageEvent {
  id: number;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costEstimate: string | null;
  timestamp: string;
  provider: string;
}

interface ExportOptions {
  filename?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  providers?: string[];
  models?: string[];
}

export function exportUsageToCSV(events: UsageEvent[], options: ExportOptions = {}) {
  // Filter events based on options
  let filteredEvents = events;

  if (options.dateRange) {
    filteredEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= options.dateRange!.start && eventDate <= options.dateRange!.end;
    });
  }

  if (options.providers && options.providers.length > 0) {
    filteredEvents = filteredEvents.filter(event => 
      options.providers!.includes(event.provider)
    );
  }

  if (options.models && options.models.length > 0) {
    filteredEvents = filteredEvents.filter(event => 
      options.models!.includes(event.model)
    );
  }

  // Generate CSV content
  const headers = [
    'Timestamp',
    'Provider',
    'Model',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
    'Cost Estimate (USD)',
    'Event ID'
  ];

  const csvRows = [
    headers.join(','),
    ...filteredEvents.map(event => {
      const inputTokens = event.tokensIn || 0;
      const outputTokens = event.tokensOut || 0;
      const totalTokens = inputTokens + outputTokens;
      const cost = parseFloat(event.costEstimate || '0');
      
      return [
        `"${new Date(event.timestamp).toISOString()}"`,
        `"${event.provider}"`,
        `"${event.model}"`,
        inputTokens,
        outputTokens,
        totalTokens,
        cost.toFixed(6),
        event.id
      ].join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  const filename = options.filename || `usage_export_${new Date().toISOString().split('T')[0]}.csv`;

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    recordsExported: filteredEvents.length,
    filename
  };
}

export function exportUsageSummaryToCSV(events: UsageEvent[], options: ExportOptions = {}) {
  // Filter events
  let filteredEvents = events;

  if (options.dateRange) {
    filteredEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= options.dateRange!.start && eventDate <= options.dateRange!.end;
    });
  }

  // Aggregate data by model and provider
  const aggregated = filteredEvents.reduce((acc, event) => {
    const key = `${event.provider}-${event.model}`;
    if (!acc[key]) {
      acc[key] = {
        provider: event.provider,
        model: event.model,
        requestCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        firstUsed: event.timestamp,
        lastUsed: event.timestamp
      };
    }

    acc[key].requestCount++;
    acc[key].totalInputTokens += event.tokensIn || 0;
    acc[key].totalOutputTokens += event.tokensOut || 0;
    acc[key].totalCost += parseFloat(event.costEstimate || '0');
    
    if (new Date(event.timestamp) < new Date(acc[key].firstUsed)) {
      acc[key].firstUsed = event.timestamp;
    }
    if (new Date(event.timestamp) > new Date(acc[key].lastUsed)) {
      acc[key].lastUsed = event.timestamp;
    }

    return acc;
  }, {} as Record<string, any>);

  // Generate summary CSV
  const headers = [
    'Provider',
    'Model',
    'Request Count',
    'Total Input Tokens',
    'Total Output Tokens',
    'Total Tokens',
    'Total Cost (USD)',
    'Average Cost per Request',
    'First Used',
    'Last Used'
  ];

  const csvRows = [
    headers.join(','),
    ...Object.values(aggregated).map((item: any) => {
      const totalTokens = item.totalInputTokens + item.totalOutputTokens;
      const avgCostPerRequest = item.requestCount > 0 ? item.totalCost / item.requestCount : 0;
      
      return [
        `"${item.provider}"`,
        `"${item.model}"`,
        item.requestCount,
        item.totalInputTokens,
        item.totalOutputTokens,
        totalTokens,
        item.totalCost.toFixed(6),
        avgCostPerRequest.toFixed(6),
        `"${new Date(item.firstUsed).toISOString()}"`,
        `"${new Date(item.lastUsed).toISOString()}"`
      ].join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  const filename = options.filename || `usage_summary_${new Date().toISOString().split('T')[0]}.csv`;

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    recordsExported: Object.keys(aggregated).length,
    filename
  };
}

// Calculate period-over-period growth
export function calculateUsageGrowth(events: UsageEvent[]): {
  currentPeriod: { tokens: number; cost: number; requests: number };
  previousPeriod: { tokens: number; cost: number; requests: number };
  growth: { tokens: number; cost: number; requests: number };
} {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currentPeriodEvents = events.filter(event => 
    new Date(event.timestamp) >= thirtyDaysAgo
  );
  
  const previousPeriodEvents = events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= sixtyDaysAgo && eventDate < thirtyDaysAgo;
  });

  const currentPeriod = {
    tokens: currentPeriodEvents.reduce((sum, e) => sum + (e.tokensIn || 0) + (e.tokensOut || 0), 0),
    cost: currentPeriodEvents.reduce((sum, e) => sum + parseFloat(e.costEstimate || '0'), 0),
    requests: currentPeriodEvents.length
  };

  const previousPeriod = {
    tokens: previousPeriodEvents.reduce((sum, e) => sum + (e.tokensIn || 0) + (e.tokensOut || 0), 0),
    cost: previousPeriodEvents.reduce((sum, e) => sum + parseFloat(e.costEstimate || '0'), 0),
    requests: previousPeriodEvents.length
  };

  const growth = {
    tokens: previousPeriod.tokens > 0 ? ((currentPeriod.tokens - previousPeriod.tokens) / previousPeriod.tokens) * 100 : 0,
    cost: previousPeriod.cost > 0 ? ((currentPeriod.cost - previousPeriod.cost) / previousPeriod.cost) * 100 : 0,
    requests: previousPeriod.requests > 0 ? ((currentPeriod.requests - previousPeriod.requests) / previousPeriod.requests) * 100 : 0
  };

  return { currentPeriod, previousPeriod, growth };
}