import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../lib/database';
import { encrypt, decrypt } from '../../../lib/encryption';

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
        created_at timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
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
      .select({
        id: schema.providerKeys.id,
        provider: schema.providerKeys.provider,
        createdAt: schema.providerKeys.createdAt,
      })
      .from(schema.providerKeys)
      .where(eq(schema.providerKeys.userId, userId));

    return NextResponse.json({ keys: providerKeys });
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
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    // Validate provider
    const validProviders = ['openai', 'anthropic', 'google', 'cohere'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported providers: openai, anthropic, google, cohere' },
        { status: 400 }
      );
    }

    await initializeTables();
    await ensureUser(userId);

    // Encrypt the API key
    const encryptedData = encrypt(apiKey);

    // Insert the encrypted key into the database
    const [newKey] = await db
      .insert(schema.providerKeys)
      .values({
        userId,
        provider: provider.toLowerCase(),
        encryptedKey: encryptedData.encryptedText,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
      })
      .returning({
        id: schema.providerKeys.id,
        provider: schema.providerKeys.provider,
        createdAt: schema.providerKeys.createdAt,
      });

    return NextResponse.json({ 
      key: newKey,
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