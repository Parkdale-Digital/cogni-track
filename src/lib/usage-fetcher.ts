import { decrypt } from './encryption';
import { db } from './database';
import { providerKeys, usageEvents } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface OpenAIUsageResponse {
  data: Array<{
    aggregation_timestamp: number;
    n_requests: number;
    operation: string;
    snapshot_id: string;
    n_context_tokens_total: number;
    n_generated_tokens_total: number;
  }>;
}

interface UsageEventData {
  model: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  timestamp: Date;
}

// OpenAI pricing per 1K tokens (as of 2024)
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = OPENAI_PRICING[model] || OPENAI_PRICING['gpt-3.5-turbo'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

function extractModelFromOperation(operation: string): string {
  // OpenAI operation format example: "chat-completions-gpt-4-turbo"
  const parts = operation.split('-');
  if (parts.length >= 3) {
    return parts.slice(2).join('-');
  }
  return operation;
}

export async function fetchOpenAIUsage(apiKey: string, startDate: Date, endDate: Date): Promise<UsageEventData[]> {
  const startTimestamp = Math.floor(startDate.getTime() / 1000);
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  
  const url = `https://api.openai.com/v1/usage?start_time=${startTimestamp}&end_time=${endTimestamp}`;
  
  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (process.env.OPENAI_ORGANIZATION) {
      headers['OpenAI-Organization'] = process.env.OPENAI_ORGANIZATION;
    }

    if (process.env.OPENAI_PROJECT) {
      headers['OpenAI-Project'] = process.env.OPENAI_PROJECT;
    }

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data: OpenAIUsageResponse = await response.json();
    
    return data.data.map(usage => {
      const model = extractModelFromOperation(usage.operation);
      const inputTokens = usage.n_context_tokens_total || 0;
      const outputTokens = usage.n_generated_tokens_total || 0;
      const cost = calculateCost(model, inputTokens, outputTokens);
      
      return {
        model,
        tokensIn: inputTokens,
        tokensOut: outputTokens,
        costEstimate: cost,
        timestamp: new Date(usage.aggregation_timestamp * 1000),
      };
    });
  } catch (error) {
    console.error('Error fetching OpenAI usage:', error);
    throw error;
  }
}

export async function fetchAndStoreUsageForUser(userId: string, daysBack: number = 1): Promise<void> {
  try {
    // Get all OpenAI keys for the user
    const userKeys = await db
      .select()
      .from(providerKeys)
      .where(and(
        eq(providerKeys.userId, userId),
        eq(providerKeys.provider, 'openai')
      ));

    if (userKeys.length === 0) {
      console.log(`No OpenAI keys found for user ${userId}`);
      return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    for (const keyRecord of userKeys) {
      try {
        // Decrypt the API key
        const decryptedKey = decrypt({
          encryptedText: keyRecord.encryptedKey,
          iv: keyRecord.iv,
          authTag: keyRecord.authTag,
        });

        // Fetch usage data from OpenAI
        const usageData = await fetchOpenAIUsage(decryptedKey, startDate, endDate);

        // Store usage events in database with deduplication
        let newEventsCount = 0;
        for (const usage of usageData) {
          // Check if this exact event already exists
          const existingEvent = await db
            .select()
            .from(usageEvents)
            .where(and(
              eq(usageEvents.keyId, keyRecord.id),
              eq(usageEvents.model, usage.model),
              eq(usageEvents.timestamp, usage.timestamp),
              eq(usageEvents.tokensIn, usage.tokensIn),
              eq(usageEvents.tokensOut, usage.tokensOut)
            ))
            .limit(1);

          // Only insert if the event doesn't already exist
          if (existingEvent.length === 0) {
            await db.insert(usageEvents).values({
              keyId: keyRecord.id,
              model: usage.model,
              tokensIn: usage.tokensIn,
              tokensOut: usage.tokensOut,
              costEstimate: usage.costEstimate.toFixed(6),
              timestamp: usage.timestamp,
            });
            newEventsCount++;
          }
        }

        console.log(`Stored ${newEventsCount} new usage events for key ${keyRecord.id} (${usageData.length - newEventsCount} duplicates skipped)`);
      } catch (error) {
        console.error(`Error processing key ${keyRecord.id}:`, error);
        // Continue with other keys even if one fails
      }
    }
  } catch (error) {
    console.error('Error in fetchAndStoreUsageForUser:', error);
    throw error;
  }
}
