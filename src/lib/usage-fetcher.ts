import { decrypt } from './encryption';
import { getDb } from './database';
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
  num_model_requests?: number;
  service_tier?: string;
  batch?: boolean;
  input_cached_tokens?: number;
  input_uncached_tokens?: number;
  input_text_tokens?: number;
  output_text_tokens?: number;
  input_cached_text_tokens?: number;
  input_audio_tokens?: number;
  input_cached_audio_tokens?: number;
  output_audio_tokens?: number;
  input_image_tokens?: number;
  input_cached_image_tokens?: number;
  output_image_tokens?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_cost?: number;
  } | null;
}

interface OpenAIAdminUsageRecord {
  start_time?: number;
  start_time_iso?: string;
  end_time?: number;
  end_time_iso?: string;
  project_id?: string;
  api_key_id?: string;
  user_id?: string;
  service_tier?: string;
  batch?: boolean;
  num_model_requests?: number;
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
  windowStart?: Date;
  windowEnd?: Date;
  projectId?: string;
  openaiUserId?: string;
  openaiApiKeyId?: string;
  serviceTier?: string;
  batch?: boolean;
  numModelRequests?: number;
  inputCachedTokens?: number;
  inputUncachedTokens?: number;
  inputTextTokens?: number;
  outputTextTokens?: number;
  inputCachedTextTokens?: number;
  inputAudioTokens?: number;
  inputCachedAudioTokens?: number;
  outputAudioTokens?: number;
  inputImageTokens?: number;
  inputCachedImageTokens?: number;
  outputImageTokens?: number;
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
function asFiniteNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const OPENAI_ADMIN_LIMIT = Math.max(1, Math.min(asFiniteNumber(process.env.OPENAI_ADMIN_LIMIT, 31), 31));
const ENABLE_SIMULATED_USAGE = (process.env.ENABLE_SIMULATED_USAGE ?? 'false').toLowerCase() === 'true';
const ADMIN_REQUESTS_PER_MINUTE = Math.max(
  1,
  Math.min(asFiniteNumber(process.env.OPENAI_ADMIN_REQUESTS_PER_MINUTE, 50), 60)
);
const ADMIN_MAX_BURST = Math.max(1, asFiniteNumber(process.env.OPENAI_ADMIN_MAX_BURST, 10));
const ADMIN_THROTTLE_WINDOW_SECONDS = 60;
const ADMIN_THROTTLE_TIMEOUT_MS = Math.max(
  1000,
  asFiniteNumber(process.env.OPENAI_ADMIN_THROTTLE_TIMEOUT_MS, 60000)
);

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
let adminThrottleQueue: Promise<void> = Promise.resolve();
let adminTokens = ADMIN_MAX_BURST;
let adminLastRefill = Date.now();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function refillAdminTokens(): void {
  const now = Date.now();
  const elapsedSeconds = (now - adminLastRefill) / 1000;
  if (elapsedSeconds <= 0) return;
  const tokensToAdd = elapsedSeconds * (ADMIN_REQUESTS_PER_MINUTE / ADMIN_THROTTLE_WINDOW_SECONDS);
  if (tokensToAdd > 0) {
    adminTokens = Math.min(ADMIN_MAX_BURST, adminTokens + tokensToAdd);
    adminLastRefill = now;
  }
}

async function acquireAdminToken(): Promise<void> {
  if (ADMIN_REQUESTS_PER_MINUTE <= 0) return;
  const start = Date.now();
  while (true) {
    refillAdminTokens();
    if (adminTokens >= 1) {
      adminTokens -= 1;
      return;
    }
    const now = Date.now();
    const elapsed = now - start;
    if (elapsed > ADMIN_THROTTLE_TIMEOUT_MS) {
      throw new Error('Admin throttle timed out while waiting for token');
    }
    const tokensNeeded = Math.max(0, 1 - adminTokens);
    const refillRatePerMs = ADMIN_REQUESTS_PER_MINUTE / (ADMIN_THROTTLE_WINDOW_SECONDS * 1000);
    const timeUntilNextTokenMs = tokensNeeded > 0 ? Math.ceil(tokensNeeded / refillRatePerMs) : 1;
    const remainingTimeoutMs = Math.max(1, ADMIN_THROTTLE_TIMEOUT_MS - elapsed);
    await sleep(Math.min(timeUntilNextTokenMs, remainingTimeoutMs));
  }
}

function throttleAdminRequest(): Promise<void> {
  adminThrottleQueue = adminThrottleQueue
    .catch(() => undefined)
    .then(() => acquireAdminToken());
  return adminThrottleQueue;
}

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

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const n = safeNumber(value);
  return Number.isFinite(n) ? n : undefined;
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

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }
  return null;
}

async function retryFetch(
  url: string,
  init: RequestInit,
  attempts = 3,
  baseDelayMs = 300,
  respectRetryAfter = false
): Promise<Response> {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}`);
        if (respectRetryAfter) {
          const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
          if (retryAfterMs !== null && retryAfterMs > 0) {
            await sleep(retryAfterMs);
            continue;
          }
        }
      } else {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
    const jitter = Math.floor(Math.random() * 250);
    await sleep(baseDelayMs * (i + 1) + jitter);
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

interface AdminUsageContext {
  timestamp: Date;
  windowStart: Date;
  windowEnd: Date;
  projectId?: string;
  openaiApiKeyId?: string;
  openaiUserId?: string;
  serviceTier?: string;
  batch?: boolean;
  numModelRequests?: number;
}

function normalizeAdminResults(results: OpenAIAdminResultItem[], context: AdminUsageContext): UsageEventData[] {
  return results.map((item) => {
    const model = extractModelFromAdminItem(item);
    const tokensIn = safeNumber(item.input_tokens ?? item.prompt_tokens ?? item.usage?.prompt_tokens ?? 0);
    const tokensOut = safeNumber(item.output_tokens ?? item.completion_tokens ?? item.usage?.completion_tokens ?? 0);
    let cost = safeNumber(item.cost ?? item.amount ?? item.usage?.total_cost ?? 0);
    let pricingKey: string | undefined;
    let pricingFallback: boolean | undefined;
    if (cost <= 0) {
      const estimate = calculateCost(model, tokensIn, tokensOut);
      cost = estimate.amount;
      pricingKey = estimate.pricingKey;
      pricingFallback = estimate.fallback;
    }
    const usageEvent: UsageEventData = {
      model,
      tokensIn,
      tokensOut,
      costEstimate: Number(cost.toFixed(6)),
      timestamp: context.timestamp,
      windowStart: context.windowStart,
      windowEnd: context.windowEnd,
      projectId: context.projectId,
      openaiApiKeyId: context.openaiApiKeyId,
      openaiUserId: context.openaiUserId,
      serviceTier: item.service_tier ?? context.serviceTier,
      batch: typeof item.batch === 'boolean' ? item.batch : context.batch,
      numModelRequests: optionalNumber(item.num_model_requests) ?? context.numModelRequests,
      inputCachedTokens: optionalNumber(item.input_cached_tokens),
      inputUncachedTokens: optionalNumber(item.input_uncached_tokens),
      inputTextTokens: optionalNumber(item.input_text_tokens),
      outputTextTokens: optionalNumber(item.output_text_tokens),
      inputCachedTextTokens: optionalNumber(item.input_cached_text_tokens),
      inputAudioTokens: optionalNumber(item.input_audio_tokens),
      inputCachedAudioTokens: optionalNumber(item.input_cached_audio_tokens),
      outputAudioTokens: optionalNumber(item.output_audio_tokens),
      inputImageTokens: optionalNumber(item.input_image_tokens),
      inputCachedImageTokens: optionalNumber(item.input_cached_image_tokens),
      outputImageTokens: optionalNumber(item.output_image_tokens),
    };
    if (pricingKey !== undefined || pricingFallback !== undefined) {
      usageEvent.pricingKey = pricingKey;
      usageEvent.pricingFallback = pricingFallback;
    }
    return usageEvent;
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
    await throttleAdminRequest();
    const response = await retryFetch(current.toString(), { headers }, 3, 500, true);
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
      try {
        const nextUrl = new URL(json.next_page, current);
        if (nextUrl.protocol !== 'https:' || nextUrl.hostname !== 'api.openai.com') {
          console.error('[usage-fetcher] Aborting pagination due to unexpected host in next_page', {
            nextPage: json.next_page,
            resolved: nextUrl.toString(),
          });
          break;
        }
        current = nextUrl;
      } catch (error) {
        console.error('[usage-fetcher] Failed to parse next_page URL', {
          nextPage: json.next_page,
          error,
        });
        break;
      }
    } else {
      break;
    }
  }

  const events: UsageEventData[] = [];

  for (const page of pages) {
    const records = Array.isArray(page.data) ? page.data : [];
    for (const record of records) {
      const windowStart = record.start_time_iso ? new Date(record.start_time_iso) : asDate(record.start_time, startDate);
      const windowEnd = record.end_time_iso ? new Date(record.end_time_iso) : addDays(windowStart, 1);
      const results = Array.isArray(record.results) ? record.results : [];
      const context: AdminUsageContext = {
        timestamp: windowStart,
        windowStart,
        windowEnd,
        projectId: record.project_id ?? undefined,
        openaiApiKeyId: record.api_key_id ?? undefined,
        openaiUserId: record.user_id ?? undefined,
        serviceTier: record.service_tier ?? undefined,
        batch: typeof record.batch === 'boolean' ? record.batch : undefined,
        numModelRequests: optionalNumber(record.num_model_requests),
      };
      events.push(...normalizeAdminResults(results, context));
    }

    const dailyCosts = Array.isArray(page.daily_costs) ? page.daily_costs : [];
    for (const daily of dailyCosts) {
      const windowStart = asDate((daily as any)?.timestamp, startDate);
      const windowEnd = addDays(windowStart, 1);
      const items = Array.isArray((daily as any)?.line_items) ? (daily as any).line_items! : [];
      const context: AdminUsageContext = {
        timestamp: windowStart,
        windowStart,
        windowEnd,
      };
      events.push(...normalizeAdminResults(items, context));
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
    const timestamp = new Date(usage.aggregation_timestamp * 1000);
    const windowStart = startOfDayUtc(timestamp);
    const windowEnd = addDays(windowStart, 1);

    return {
      model,
      tokensIn: inputTokens,
      tokensOut: outputTokens,
      costEstimate: Number(amount.toFixed(6)),
      timestamp,
      windowStart,
      windowEnd,
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
    const windowStart = startOfDayUtc(ts);

    events.push({
      model,
      tokensIn,
      tokensOut,
      costEstimate: Number(amount.toFixed(6)),
      timestamp: ts,
      windowStart,
      windowEnd: addDays(windowStart, 1),
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
    const db = getDb();
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
          const windowStart = usage.windowStart ? new Date(usage.windowStart) : startOfDayUtc(usage.timestamp);
          const windowEnd = usage.windowEnd ? new Date(usage.windowEnd) : addDays(windowStart, 1);
          const existingEvent = await db
            .select()
            .from(usageEvents)
            .where(and(
              eq(usageEvents.keyId, keyRecord.id),
              eq(usageEvents.model, usage.model),
              eq(usageEvents.windowStart, windowStart),
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
              windowStart,
              windowEnd,
              projectId: usage.projectId,
              openaiUserId: usage.openaiUserId,
              openaiApiKeyId: usage.openaiApiKeyId,
              serviceTier: usage.serviceTier,
              batch: usage.batch ?? undefined,
              numModelRequests: usage.numModelRequests,
              inputCachedTokens: usage.inputCachedTokens,
              inputUncachedTokens: usage.inputUncachedTokens,
              inputTextTokens: usage.inputTextTokens,
              outputTextTokens: usage.outputTextTokens,
              inputCachedTextTokens: usage.inputCachedTextTokens,
              inputAudioTokens: usage.inputAudioTokens,
              inputCachedAudioTokens: usage.inputCachedAudioTokens,
              outputAudioTokens: usage.outputAudioTokens,
              inputImageTokens: usage.inputImageTokens,
              inputCachedImageTokens: usage.inputCachedImageTokens,
              outputImageTokens: usage.outputImageTokens,
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
