import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../../../../lib/database';
import { encrypt, decrypt } from '../../../../lib/encryption';

// GET /api/keys/[id] - Get a specific provider key (decrypted for display purposes only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = parseInt(params.id);
    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
    }

    const [providerKey] = await db
      .select()
      .from(schema.providerKeys)
      .where(
        and(
          eq(schema.providerKeys.id, keyId),
          eq(schema.providerKeys.userId, userId)
        )
      );

    if (!providerKey) {
      return NextResponse.json({ error: 'Provider key not found' }, { status: 404 });
    }

    // For security, we'll only return the first and last 4 characters
    const decryptedKey = decrypt({
      encryptedText: providerKey.encryptedKey,
      iv: providerKey.iv,
      authTag: providerKey.authTag,
    });

    const maskedKey = decryptedKey.length > 8 
      ? `${decryptedKey.slice(0, 4)}...${decryptedKey.slice(-4)}`
      : '****';

    return NextResponse.json({
      key: {
        id: providerKey.id,
        provider: providerKey.provider,
        maskedKey,
        createdAt: providerKey.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching provider key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider key' },
      { status: 500 }
    );
  }
}

// PUT /api/keys/[id] - Update an existing provider key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = parseInt(params.id);
    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Check if the key exists and belongs to the user
    const [existingKey] = await db
      .select()
      .from(schema.providerKeys)
      .where(
        and(
          eq(schema.providerKeys.id, keyId),
          eq(schema.providerKeys.userId, userId)
        )
      );

    if (!existingKey) {
      return NextResponse.json({ error: 'Provider key not found' }, { status: 404 });
    }

    // Encrypt the new API key
    const encryptedData = encrypt(apiKey);

    // Update the encrypted key in the database
    const [updatedKey] = await db
      .update(schema.providerKeys)
      .set({
        encryptedKey: encryptedData.encryptedText,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
      })
      .where(
        and(
          eq(schema.providerKeys.id, keyId),
          eq(schema.providerKeys.userId, userId)
        )
      )
      .returning({
        id: schema.providerKeys.id,
        provider: schema.providerKeys.provider,
        createdAt: schema.providerKeys.createdAt,
      });

    return NextResponse.json({ 
      key: updatedKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    console.error('Error updating provider key:', error);
    return NextResponse.json(
      { error: 'Failed to update provider key' },
      { status: 500 }
    );
  }
}

// DELETE /api/keys/[id] - Delete a provider key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keyId = parseInt(params.id);
    if (isNaN(keyId)) {
      return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });
    }

    // Check if the key exists and belongs to the user
    const [existingKey] = await db
      .select()
      .from(schema.providerKeys)
      .where(
        and(
          eq(schema.providerKeys.id, keyId),
          eq(schema.providerKeys.userId, userId)
        )
      );

    if (!existingKey) {
      return NextResponse.json({ error: 'Provider key not found' }, { status: 404 });
    }

    // Delete the key (usage events will be cascade deleted)
    await db
      .delete(schema.providerKeys)
      .where(
        and(
          eq(schema.providerKeys.id, keyId),
          eq(schema.providerKeys.userId, userId)
        )
      );

    return NextResponse.json({ 
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting provider key:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider key' },
      { status: 500 }
    );
  }
}