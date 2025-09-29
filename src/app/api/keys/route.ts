import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../lib/database';
import { encrypt, decrypt } from '../../../lib/encryption';

type ProviderKeyRecord = typeof schema.providerKeys.$inferSelect;

function parseOrgMetadata(key: ProviderKeyRecord): { organizationId?: string; projectId?: string } {
  if (!key.encryptedMetadata || !key.metadataIv || !key.metadataAuthTag) {
    return {};
  }

  try {
    const decrypted = decrypt({
      encryptedText: key.encryptedMetadata,
      iv: key.metadataIv,
      authTag: key.metadataAuthTag,
    });
    const parsed = JSON.parse(decrypted);
    const organizationId = typeof parsed.organizationId === 'string' ? parsed.organizationId : undefined;
    const projectId = typeof parsed.projectId === 'string' ? parsed.projectId : undefined;
    return { organizationId, projectId };
  } catch (error) {
    console.error('Failed to decrypt provider metadata', {
      keyId: key.id,
      error: error instanceof Error ? error.message : error,
    });
    return {};
  }
}

function normalizeOrgId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^org[-_]/i.test(trimmed)) {
    return trimmed;
  }
  return `org-${trimmed}`;
}

function normalizeProjectId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^proj[-_]/i.test(trimmed)) {
    return trimmed;
  }
  return `proj_${trimmed}`;
}

// Initialize database tables if they don't exist
async function initializeTables() {
  try {
    // Create users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);

    // Create provider_keys table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS provider_keys (
        id serial PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        provider text NOT NULL,
        encrypted_key text NOT NULL,
        iv text NOT NULL,
        auth_tag text NOT NULL,
        usage_mode text NOT NULL DEFAULT 'standard',
        encrypted_metadata text,
        metadata_iv text,
        metadata_auth_tag text,
        created_at timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Ensure new columns exist when upgrading an older schema
    await db.execute(`
      ALTER TABLE provider_keys
        ADD COLUMN IF NOT EXISTS usage_mode text NOT NULL DEFAULT 'standard',
        ADD COLUMN IF NOT EXISTS encrypted_metadata text,
        ADD COLUMN IF NOT EXISTS metadata_iv text,
        ADD COLUMN IF NOT EXISTS metadata_auth_tag text;
    `);

    // Create usage_events table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS usage_events (
        id serial PRIMARY KEY NOT NULL,
        key_id integer NOT NULL,
        model text NOT NULL,
        tokens_in integer DEFAULT 0,
        tokens_out integer DEFAULT 0,
        cost_estimate numeric(10, 6) DEFAULT '0',
        timestamp timestamp NOT NULL,
        FOREIGN KEY (key_id) REFERENCES provider_keys(id) ON DELETE CASCADE
      )
    `);
  } catch (error) {
    console.log('Tables might already exist or there was an initialization error:', error);
  }
}

// Ensure user exists in our database
async function ensureUser(userId: string) {
  try {
    await db.insert(schema.users).values({
      id: userId,
    }).onConflictDoNothing();
  } catch (error) {
    console.log('User might already exist:', error);
  }
}

// GET /api/keys - List all provider keys for the authenticated user
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeTables();
    await ensureUser(userId);

    const providerKeys = await db
      .select()
      .from(schema.providerKeys)
      .where(eq(schema.providerKeys.userId, userId));

    // Decrypt and mask keys for display
    const keysWithMasked = providerKeys.map(key => {
      try {
        const decryptedKey = decrypt({
          encryptedText: key.encryptedKey,
          iv: key.iv,
          authTag: key.authTag,
        });
        
        const maskedKey = decryptedKey.length > 8 
          ? `${decryptedKey.slice(0, 4)}...${decryptedKey.slice(-4)}`
          : '****';

        return {
          id: key.id,
          provider: key.provider,
          maskedKey,
          createdAt: key.createdAt,
          usageMode: (key.usageMode ?? 'standard') as 'standard' | 'admin',
          hasOrgConfig: Boolean(key.encryptedMetadata && key.metadataIv && key.metadataAuthTag),
        };
      } catch (error) {
        console.error('Error decrypting key:', error);
        return {
          id: key.id,
          provider: key.provider,
          maskedKey: '****',
          createdAt: key.createdAt,
          usageMode: (key.usageMode ?? 'standard') as 'standard' | 'admin',
          hasOrgConfig: Boolean(key.encryptedMetadata && key.metadataIv && key.metadataAuthTag),
        };
      }
    });

    return NextResponse.json({ keys: keysWithMasked });
  } catch (error) {
    console.error('Error fetching provider keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider keys' },
      { status: 500 }
    );
  }
}

// POST /api/keys - Add a new provider key (encrypted)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, usageMode = 'standard', organizationId, projectId } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    // Validate provider
    const normalizedProvider = provider.toLowerCase();
    const validProviders = ['openai', 'anthropic', 'google', 'cohere'];
    if (!validProviders.includes(normalizedProvider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported providers: openai, anthropic, google, cohere' },
        { status: 400 }
      );
    }

    const trimmedOrgId = typeof organizationId === 'string' ? organizationId.trim() : '';
    const trimmedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
    const normalizedOrgId = trimmedOrgId ? normalizeOrgId(trimmedOrgId) : '';
    const normalizedProjectId = trimmedProjectId ? normalizeProjectId(trimmedProjectId) : '';

    const normalizedUsageMode = (typeof usageMode === 'string' ? usageMode.toLowerCase() : 'standard') as 'standard' | 'admin';
    if (!['standard', 'admin'].includes(normalizedUsageMode)) {
      return NextResponse.json(
        { error: 'usageMode must be either "standard" or "admin"' },
        { status: 400 }
      );
    }

    if (normalizedUsageMode === 'admin' && normalizedProvider !== 'openai') {
      return NextResponse.json(
        { error: 'Admin usage mode is only supported for OpenAI keys.' },
        { status: 400 }
      );
    }

    if (normalizedUsageMode === 'admin' && (!normalizedOrgId || !normalizedProjectId)) {
      return NextResponse.json(
        { error: 'Organization ID and Project ID are required when using admin mode.' },
        { status: 400 }
      );
    }

    await initializeTables();
    await ensureUser(userId);

    // Encrypt the API key
    const encryptedData = encrypt(apiKey);

    const metadataEncryption =
      normalizedUsageMode === 'admin'
        ? encrypt(
            JSON.stringify({
              organizationId: normalizedOrgId,
              projectId: normalizedProjectId,
            })
          )
        : null;

    // Insert the encrypted key into the database
    const [newKey] = await db
      .insert(schema.providerKeys)
      .values({
        userId,
        provider: normalizedProvider,
        encryptedKey: encryptedData.encryptedText,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        usageMode: normalizedUsageMode,
        encryptedMetadata: metadataEncryption?.encryptedText ?? null,
        metadataIv: metadataEncryption?.iv ?? null,
        metadataAuthTag: metadataEncryption?.authTag ?? null,
      })
      .returning({
        id: schema.providerKeys.id,
        provider: schema.providerKeys.provider,
        createdAt: schema.providerKeys.createdAt,
        usageMode: schema.providerKeys.usageMode,
      });

    return NextResponse.json({ 
      key: {
        ...newKey,
        usageMode: (newKey.usageMode ?? 'standard') as 'standard' | 'admin',
        hasOrgConfig: Boolean(metadataEncryption),
      },
      message: 'API key added successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding provider key:', error);
    return NextResponse.json(
      { error: 'Failed to add provider key' },
      { status: 500 }
    );
  }
}
