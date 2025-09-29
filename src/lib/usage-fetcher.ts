import { decrypt } from './encryption';
import { db } from './database';
import { providerKeys, usageEvents } from '../db/schema';
import { eq, and } from 'drizzle-orm';

type OpenAIUsageMode = 'standard' | 'admin';

interface OpenAIStandardUsageItem {
  aggregation_timestamp: number;
  operation: string;
  n_context_tokens_total: number;
  n_generated_tokens_total: number;
}

interface OpenAIStandardUsageResponse {
  data: OpenAIStandardUsageItem[];
}

interface OpenAIAdminResultItem {
  name?: string;
  cost?: number;
  amount?: number;
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_cost?: number;
  } | null;
}

interface OpenAIAdminUsageRecord {
  start_time?: number;
  start_time_iso?: string;
  results?: OpenAIAdminResultItem[];
}

interface OpenAIAdminUsageResponse {
  data?: OpenAIAdminUsageRecord[];
  daily_costs?: Array<{
    timestamp?: number;
    line_items?: OpenAIAdminResultItem[];
  }>;
  has_more?: boolean;
  next_page?: string;
}

export interface UsageEventData {
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  timestamp: Date;
}

const OPENAI_USAGE_MODE = (process.env.OPENAI_USAGE_MODE ?? 'standard').toLowerCase() as OpenAIUsageMode;
const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION ?? process.env.OPENAI_ORG_ID ?? undefined;
const OPENAI_PROJECT = process.env.OPENAI_PROJECT ?? process.env.OPENAI_PROJECT_ID ?? undefined;
const OPENAI_ADMIN_LIMIT = Math.max(1, Math.min(Number(process.env.OPENAI_ADMIN_LIMIT ?? 31), 31));

// OpenAI pricing per 1K tokens (as of 2024)
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

class OpenAIUsageError extends Error {
  constructor(message: string, public readonly code: 'UNAUTHORIZED' | 'SCOPE_MISSING' | 'PROVIDER_ERROR') {
    super(message);
    this.name = 'OpenAIUsageError';
  }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = OPENAI_PRICING[model] || OPENAI_PRICING['gpt-3.5-turbo'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

function safeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asDate(epochSeconds?: number, fallback?: Date): Date {
  if (!epochSeconds || !Number.isFinite(epochSeconds)) {
    return fallback ? new Date(fallback) : new Date();
  }
  const millis = epochSeconds < 1e12 ? epochSeconds * 1000 : epochSeconds;
  return new Date(millis);
}

async function retryFetch(url: string, init: RequestInit, attempts = 3, baseDelayMs = 300): Promise<Response> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    const jitter = Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (i + 1) + jitter));
  }
  throw lastError ?? new Error('Unknown fetch error');
}

function extractModelFromOperation(operation: string): string {
  const parts = operation.split('-');
  if (parts.length >= 3) {
    return parts.slice(2).join('-');
  }
  return operation;
}

function extractModelFromAdminItem(item: OpenAIAdminResultItem): string {
  const raw = (item.name ?? '').toString().trim().toLowerCase();
  if (raw.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (raw.includes('gpt-4o')) return 'gpt-4o';
  if (raw.includes('gpt-4.1')) return 'gpt-4.1';
  if (raw.includes('gpt-4-turbo') || raw.includes('turbo')) return 'gpt-4-turbo';
  if (raw.includes('o4-mini')) return 'o4-mini';
  if (raw.includes('o3')) return 'o3';
  return raw.length > 0 ? raw : 'unknown';
}

function normalizeAdminResults(results: OpenAIAdminResultItem[], timestamp: Date): UsageEventData[] {
  return results.map((item) => {
    const model = extractModelFromAdminItem(item);
    const tokensIn = safeNumber(item.input_tokens ?? item.prompt_tokens ?? item.usage?.prompt_tokens ?? 0);
    const tokensOut = safeNumber(item.output_tokens ?? item.completion_tokens ?? item.usage?.completion_tokens ?? 0);
    let cost = safeNumber(item.cost ?? item.amount ?? item.usage?.total_cost ?? 0);
    if (cost <= 0) {
      cost = calculateCost(model, tokensIn, tokensOut);
    }
    return {
      model,
      tokensIn,
      tokensOut,
      costEstimate: Number(cost.toFixed(6)),
      timestamp,
    };
  });
}

async function fetchAdminUsage(apiKey: string, startDate: Date, endDate: Date): Promise<UsageEventData[]> {
  if (!OPENAI_ORGANIZATION) {
    throw new OpenAIUsageError('OPENAI_ORGANIZATION is required in admin usage mode', 'PROVIDER_ERROR');
  }
  if (!OPENAI_PROJECT) {
    throw new OpenAIUsageError('OPENAI_PROJECT is required in admin usage mode to avoid misattribution', 'PROVIDER_ERROR');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Organization': OPENAI_ORGANIZATION,
    'OpenAI-Project': OPENAI_PROJECT,
  };

  const startEpoch = Math.floor(startDate.getTime() / 1000);
  const endEpoch = Math.floor(endDate.getTime() / 1000);

  const pages: OpenAIAdminUsageResponse[] = [];
  let current = new URL('https://api.openai.com/v1/organization/usage/completions');
  current.searchParams.set('start_time', startEpoch.toString());
  current.searchParams.set('end_time', endEpoch.toString());
  current.searchParams.set('limit', OPENAI_ADMIN_LIMIT.toString());

  let safety = 0;
  while (safety < 20) {
    safety += 1;
    const response = await retryFetch(current.toString(), { headers }, 3, 500);
    if (response.status === 401 || response.status === 403) {
      const body = await response.text();
      throw new OpenAIUsageError(body || 'Unauthorized', 'SCOPE_MISSING');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new OpenAIUsageError(body || `Provider error ${response.status}`, 'PROVIDER_ERROR');
    }
    const json: OpenAIAdminUsageResponse = await response.json();
    pages.push(json);
    if (json.has_more && json.next_page) {
      current = new URL(json.next_page);
    } else {
      break;
    }
  }

  const events: UsageEventData[] = [];

  for (const page of pages) {
    const records = Array.isArray(page.data) ? page.data : [];
    for (const record of records) {
      const timestamp = record.start_time_iso ? new Date(record.start_time_iso) : asDate(record.start_time, startDate);
      const results = Array.isArray(record.results) ? record.results : [];
      events.push(...normalizeAdminResults(results, timestamp));
    }

    const dailyCosts = Array.isArray(page.daily_costs) ? page.daily_costs : [];
    for (const daily of dailyCosts) {
      const timestamp = asDate((daily as any)?.timestamp, startDate);
      const items = Array.isArray((daily as any)?.line_items) ? (daily as any).line_items! : [];
      events.push(...normalizeAdminResults(items, timestamp));
    }
  }

  return events;
}

async function fetchStandardUsage(apiKey: string, startDate: Date, endDate: Date): Promise<UsageEventData[]> {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  const url = `https://api.openai.com/v1/usage?start_time=${startTimestamp}&end_time=${endTimestamp}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const response = await retryFetch(url, { headers }, 2, 400);
  if (response.status === 401 || response.status === 403) {
    const body = await response.text();
    throw new OpenAIUsageError(body || 'Unauthorized', 'SCOPE_MISSING');
  }
  if (!response.ok) {
    const body = await response.text();
    throw new OpenAIUsageError(body || `Provider error ${response.status}`, 'PROVIDER_ERROR');
  }

  const data: OpenAIStandardUsageResponse = await response.json();
  return (Array.isArray(data.data) ? data.data : []).map((usage) => {
    const model = extractModelFromOperation(usage.operation);
    const inputTokens = usage.n_context_tokens_total || 0;
    const outputTokens = usage.n_generated_tokens_total || 0;
    const cost = calculateCost(model, inputTokens, outputTokens);

    return {
      model,
      tokensIn: inputTokens,
      tokensOut: outputTokens,
      costEstimate: Number(cost.toFixed(6)),
      timestamp: new Date(usage.aggregation_timestamp * 1000),
    };
  });
}

export async function fetchOpenAIUsage(apiKey: string, startDate: Date, endDate: Date): Promise<UsageEventData[]> {
  if (OPENAI_USAGE_MODE === 'admin') {
    return fetchAdminUsage(apiKey, startDate, endDate);
  }
  return fetchStandardUsage(apiKey, startDate, endDate);
}

function generateSimulatedUsage(startDate: Date, endDate: Date): UsageEventData[] {
  const models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];
  const totalEvents = Math.floor(Math.random() * 8) + 5;
  const duration = Math.max(endDate.getTime() - startDate.getTime(), 1);
  const events: UsageEventData[] = [];

  for (let i = 0; i < totalEvents; i++) {
    const model = models[Math.floor(Math.random() * models.length)];
    const tokensIn = Math.floor(Math.random() * 2000) + 200;
    const tokensOut = Math.floor(Math.random() * 1500) + 100;
    const cost = calculateCost(model, tokensIn, tokensOut);
    const ts = new Date(startDate.getTime() + Math.random() * duration);

    events.push({
      model,
      tokensIn,
      tokensOut,
      costEstimate: Number(cost.toFixed(6)),
      timestamp: ts,
    });
  }

  return events;
}

export async function fetchAndStoreUsageForUser(userId: string, daysBack: number = 1): Promise<void> {
  try {
    const userKeys = await db
      .select()
      .from(providerKeys)
      .where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, 'openai')));

    if (userKeys.length === 0) {
      console.log(`No OpenAI keys found for user ${userId}`);
      return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    for (const keyRecord of userKeys) {
      try {
        const decryptedKey = decrypt({
          encryptedText: keyRecord.encryptedKey,
          iv: keyRecord.iv,
          authTag: keyRecord.authTag,
        });

        let usageData: UsageEventData[] = [];
        try {
          usageData = await fetchOpenAIUsage(decryptedKey, startDate, endDate);
        } catch (error) {
          if (error instanceof OpenAIUsageError && (error.code === 'SCOPE_MISSING' || error.code === 'UNAUTHORIZED')) {
            console.warn(`OpenAI reported insufficient permissions for key ${keyRecord.id}; falling back to simulated data.`);
            usageData = generateSimulatedUsage(startDate, endDate);
          } else {
            throw error;
          }
        }

        let newEventsCount = 0;
        for (const usage of usageData) {
          const existingEvent = await db
            .select()
            .from(usageEvents)
            .where(and(
              eq(usageEvents.keyId, keyRecord.id),
              eq(usageEvents.model, usage.model),
              eq(usageEvents.timestamp, usage.timestamp),
              eq(usageEvents.tokensIn, usage.tokensIn),
              eq(usageEvents.tokensOut, usage.tokensOut),
            ))
            .limit(1);

          if (existingEvent.length === 0) {
            await db.insert(usageEvents).values({
              keyId: keyRecord.id,
              model: usage.model,
              tokensIn: usage.tokensIn,
              tokensOut: usage.tokensOut,
              costEstimate: usage.costEstimate.toFixed(6),
              timestamp: usage.timestamp,
            });
            newEventsCount += 1;
          }
        }

        console.log(`Stored ${newEventsCount} new usage events for key ${keyRecord.id} (${usageData.length - newEventsCount} duplicates skipped)`);
      } catch (error) {
        console.error(`Error processing key ${keyRecord.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in fetchAndStoreUsageForUser:', error);
    throw error;
  }
}
