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
  pricingKey?: string;
  pricingFallback?: boolean;
}

export interface IngestionIssue {
  keyId: number;
  message: string;
  code?: string;
  status?: number;
}

export interface IngestionTelemetry {
  userId: string;
  processedKeys: number;
  simulatedKeys: number;
  failedKeys: number;
  storedEvents: number;
  skippedEvents: number;
  issues: IngestionIssue[];
}

const OPENAI_USAGE_MODE = (process.env.OPENAI_USAGE_MODE ?? 'standard').toLowerCase() as OpenAIUsageMode;
const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION ?? process.env.OPENAI_ORG_ID ?? undefined;
const OPENAI_PROJECT = process.env.OPENAI_PROJECT ?? process.env.OPENAI_PROJECT_ID ?? undefined;
const OPENAI_ADMIN_LIMIT = Math.max(1, Math.min(Number(process.env.OPENAI_ADMIN_LIMIT ?? 31), 31));
const ENABLE_SIMULATED_USAGE = (process.env.ENABLE_SIMULATED_USAGE ?? 'false').toLowerCase() === 'true';

type TokenPricing = {
  input: number;
  output: number;
};

const DEFAULT_PRICING_KEY = 'gpt-3.5-turbo';

// OpenAI pricing per 1K tokens (defaults; override via OPENAI_PRICING_OVERRIDES)
const OPENAI_PRICING: Record<string, TokenPricing> = {
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-5': { input: 0.015, output: 0.06 },
  'gpt-5-cached_input': { input: 0.003, output: 0 },
  'gpt-5-cached_output': { input: 0, output: 0.02 },
  'gpt-5-2025-08-07': { input: 0.015, output: 0.06 },
  'gpt-5-2025-08-07-cached_input': { input: 0.003, output: 0 },
  'gpt-5-2025-08-07-cached_output': { input: 0, output: 0.02 },
};

const PRICING_FALLBACK_RULES: Array<{ test: (model: string) => boolean; key: string }> = [
  { test: (model) => /^gpt-5.*cached[_-]?input/.test(model), key: 'gpt-5-cached_input' },
  { test: (model) => /^gpt-5.*cached[_-]?output/.test(model), key: 'gpt-5-cached_output' },
  { test: (model) => /^gpt-5/.test(model), key: 'gpt-5' },
  { test: (model) => /^gpt-4o.*mini/.test(model), key: 'gpt-4o-mini' },
  { test: (model) => /^gpt-4o/.test(model), key: 'gpt-4o' },
  { test: (model) => /^gpt-4.*turbo/.test(model), key: 'gpt-4-turbo' },
  { test: (model) => /^gpt-4/.test(model), key: 'gpt-4' },
];

const pricingOverrideEnv = process.env.OPENAI_PRICING_OVERRIDES;
let PRICING_OVERRIDES: Record<string, TokenPricing> = {};
if (pricingOverrideEnv) {
  try {
    PRICING_OVERRIDES = JSON.parse(pricingOverrideEnv);
  } catch (error) {
    console.error('[usage-fetcher] Failed to parse OPENAI_PRICING_OVERRIDES', error);
  }
}

const PRICING_FALLBACK_WARNINGS = new Set<string>();

interface UsageModeConfiguration {
  mode: OpenAIUsageMode;
  organizationId?: string;
  projectId?: string;
}

const DEFAULT_USAGE_CONFIGURATION: UsageModeConfiguration = OPENAI_USAGE_MODE === 'admin'
  ? {
      mode: 'admin',
      organizationId: OPENAI_ORGANIZATION,
      projectId: OPENAI_PROJECT,
    }
  : { mode: 'standard' };

class OpenAIUsageError extends Error {
  constructor(message: string, public readonly code: 'UNAUTHORIZED' | 'SCOPE_MISSING' | 'PROVIDER_ERROR') {
    super(message);
    this.name = 'OpenAIUsageError';
  }
}

class UsageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageConfigurationError';
  }
}

function validateUsageConfiguration(config: UsageModeConfiguration): void {
  if (config.mode === 'admin') {
    if (!config.organizationId || !config.projectId) {
      throw new UsageConfigurationError(
        'Admin usage mode requires both organization and project identifiers.'
      );
    }
  }
}

function resolvePricing(model: string): { pricing: TokenPricing; key: string; fallback: boolean } {
  if (PRICING_OVERRIDES[model]) {
    return { pricing: PRICING_OVERRIDES[model], key: model, fallback: false };
  }

  if (OPENAI_PRICING[model]) {
    return { pricing: OPENAI_PRICING[model], key: model, fallback: false };
  }

  for (const rule of PRICING_FALLBACK_RULES) {
    if (rule.test(model)) {
      const key = rule.key;
      const pricing = PRICING_OVERRIDES[key] ?? OPENAI_PRICING[key];
      if (pricing) {
        return { pricing, key, fallback: true };
      }
    }
  }

  const defaultPricing = PRICING_OVERRIDES[DEFAULT_PRICING_KEY] ?? OPENAI_PRICING[DEFAULT_PRICING_KEY];
  return { pricing: defaultPricing, key: DEFAULT_PRICING_KEY, fallback: true };
}

function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { amount: number; pricingKey: string; fallback: boolean } {
  const { pricing, key, fallback } = resolvePricing(model);
  if (fallback && !PRICING_FALLBACK_WARNINGS.has(model)) {
    PRICING_FALLBACK_WARNINGS.add(model);
    console.warn('[usage-fetcher] Pricing fallback applied', { model, resolvedKey: key });
  }
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return {
    amount: inputCost + outputCost,
    pricingKey: key,
    fallback,
  };
}

function safeNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function decryptKeyMetadata(record: typeof providerKeys.$inferSelect): { organizationId?: string; projectId?: string } {
  if (!record.encryptedMetadata || !record.metadataIv || !record.metadataAuthTag) {
    return {};
  }

  try {
    const decrypted = decrypt({
      encryptedText: record.encryptedMetadata,
      iv: record.metadataIv,
      authTag: record.metadataAuthTag,
    });
    const parsed = JSON.parse(decrypted);
    return {
      organizationId: typeof parsed.organizationId === 'string' ? parsed.organizationId : undefined,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : undefined,
    };
  } catch (error) {
    console.error('[usage-fetcher] Failed to decrypt provider metadata', {
      keyId: record.id,
      error: error instanceof Error ? error.message : error,
    });
    return {};
  }
}

function deriveUsageConfigurationForKey(record: typeof providerKeys.$inferSelect): UsageModeConfiguration {
  const mode = (record.usageMode ?? DEFAULT_USAGE_CONFIGURATION.mode) as OpenAIUsageMode;

  if (mode === 'admin') {
    const metadata = decryptKeyMetadata(record);
    const organizationId = metadata.organizationId ?? DEFAULT_USAGE_CONFIGURATION.organizationId;
    const projectId = metadata.projectId ?? DEFAULT_USAGE_CONFIGURATION.projectId;
    return { mode, organizationId, projectId };
  }

  return { mode: 'standard' };
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

function normalizeModelIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractModelFromOperation(operation: string): string {
  const base = operation.split(':')[0] ?? operation;
  return normalizeModelIdentifier(base);
}

function extractModelFromAdminItem(item: OpenAIAdminResultItem): string {
  const candidates = [
    item.name,
    (item as unknown as { operation?: string }).operation,
    (item as unknown as { model?: string }).model,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeModelIdentifier(String(candidate));
    if (normalized) {
      return normalized;
    }
  }
  return 'unknown';
}

function normalizeAdminResults(results: OpenAIAdminResultItem[], timestamp: Date): UsageEventData[] {
  return results.map((item) => {
    const model = extractModelFromAdminItem(item);
    const tokensIn = safeNumber(item.input_tokens ?? item.prompt_tokens ?? item.usage?.prompt_tokens ?? 0);
    const tokensOut = safeNumber(item.output_tokens ?? item.completion_tokens ?? item.usage?.completion_tokens ?? 0);
    let cost = safeNumber(item.cost ?? item.amount ?? item.usage?.total_cost ?? 0);
    if (cost <= 0) {
      const { amount } = calculateCost(model, tokensIn, tokensOut);
      cost = amount;
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

async function fetchAdminUsage(
  apiKey: string,
  startDate: Date,
  endDate: Date,
  config: UsageModeConfiguration
): Promise<UsageEventData[]> {
  validateUsageConfiguration(config);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Organization': config.organizationId!,
    'OpenAI-Project': config.projectId!,
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
    const { amount, pricingKey, fallback } = calculateCost(model, inputTokens, outputTokens);

    return {
      model,
      tokensIn: inputTokens,
      tokensOut: outputTokens,
      costEstimate: Number(amount.toFixed(6)),
      timestamp: new Date(usage.aggregation_timestamp * 1000),
      pricingKey,
      pricingFallback: fallback,
    };
  });
}

export async function fetchOpenAIUsage(
  apiKey: string,
  startDate: Date,
  endDate: Date,
  config: UsageModeConfiguration
): Promise<UsageEventData[]> {
  if (config.mode === 'admin') {
    return fetchAdminUsage(apiKey, startDate, endDate, config);
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
    const { amount, pricingKey, fallback } = calculateCost(model, tokensIn, tokensOut);
    const ts = new Date(startDate.getTime() + Math.random() * duration);

    events.push({
      model,
      tokensIn,
      tokensOut,
      costEstimate: Number(amount.toFixed(6)),
      timestamp: ts,
      pricingKey,
      pricingFallback: fallback,
    });
  }

  return events;
}

export async function fetchAndStoreUsageForUser(
  userId: string,
  daysBack: number = 1
): Promise<IngestionTelemetry> {
  try {
    const userKeys = await db
      .select()
      .from(providerKeys)
      .where(and(eq(providerKeys.userId, userId), eq(providerKeys.provider, 'openai')));

    const telemetry: IngestionTelemetry = {
      userId,
      processedKeys: userKeys.length,
      simulatedKeys: 0,
      failedKeys: 0,
      storedEvents: 0,
      skippedEvents: 0,
      issues: [],
    };

    if (userKeys.length === 0) {
      console.log(`[usage-fetcher] No OpenAI keys for user`, { userId });
      return telemetry;
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

        const usageConfig = deriveUsageConfigurationForKey(keyRecord);
        let usageData: UsageEventData[] = [];
        let usedSimulation = false;
        try {
          usageData = await fetchOpenAIUsage(decryptedKey, startDate, endDate, usageConfig);
        } catch (error) {
          if (error instanceof UsageConfigurationError) {
            telemetry.failedKeys += 1;
            telemetry.issues.push({
              keyId: keyRecord.id,
              message: error.message,
              code: 'CONFIGURATION_ERROR',
            });
            console.error('[usage-fetcher] Missing configuration for admin usage mode', {
              userId,
              keyId: keyRecord.id,
              error: error.message,
            });
            continue;
          }
          if (error instanceof OpenAIUsageError && (error.code === 'SCOPE_MISSING' || error.code === 'UNAUTHORIZED')) {
            if (ENABLE_SIMULATED_USAGE) {
              telemetry.issues.push({
                keyId: keyRecord.id,
                message: error.message,
                code: error.code,
              });
              usedSimulation = true;
              telemetry.simulatedKeys += 1;
              console.warn(`[usage-fetcher] OpenAI permissions issue; using simulated data`, {
                userId,
                keyId: keyRecord.id,
                code: error.code,
              });
              usageData = generateSimulatedUsage(startDate, endDate);
            } else {
              console.error(`[usage-fetcher] OpenAI permissions issue; aborting ingestion`, {
                userId,
                keyId: keyRecord.id,
                code: error.code,
              });
              throw error;
            }
          } else {
            telemetry.failedKeys += 1;
            telemetry.issues.push({
              keyId: keyRecord.id,
              message: error instanceof Error ? error.message : 'Unknown provider error',
            });
            console.error(`[usage-fetcher] Unexpected provider failure`, {
              userId,
              keyId: keyRecord.id,
              error: error instanceof Error ? error.message : error,
            });
            throw error;
          }
        }

        let newEventsCount = 0;
        const fallbackModels = new Set<string>();
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
            telemetry.storedEvents += 1;
          } else {
            telemetry.skippedEvents += 1;
          }

          if (usage.pricingFallback) {
            fallbackModels.add(usage.model);
          }
        }

        if (usedSimulation) {
          console.log(`[usage-fetcher] Stored simulated usage events`, {
            userId,
            keyId: keyRecord.id,
            newEvents: newEventsCount,
          });
        } else {
          console.log(`[usage-fetcher] Stored usage events`, {
            userId,
            keyId: keyRecord.id,
            newEvents: newEventsCount,
            duplicates: usageData.length - newEventsCount,
          });
        }

        if (fallbackModels.size > 0) {
          const models = Array.from(fallbackModels.values()).join(', ');
          telemetry.issues.push({
            keyId: keyRecord.id,
            message: `Pricing fallback applied for models: ${models}`,
            code: 'PRICING_FALLBACK',
          });
        }
      } catch (error) {
        telemetry.failedKeys += 1;
        telemetry.issues.push({
          keyId: keyRecord.id,
          message: error instanceof Error ? error.message : 'Unknown ingestion error',
          code: error instanceof OpenAIUsageError ? error.code : undefined,
        });
        console.error(`[usage-fetcher] Error processing key`, {
          userId,
          keyId: keyRecord.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return telemetry;
  } catch (error) {
    console.error(`[usage-fetcher] Fatal ingestion error`, {
      userId,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}
