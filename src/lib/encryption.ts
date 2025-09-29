import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // For GCM, 12 bytes (96 bits) is recommended

/**
 * Get the master encryption key from environment variables
 * In production, this should be a properly managed secret
 */
function getMasterKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }

  let key: Buffer;
  try {
    key = Buffer.from(rawKey, 'base64');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be a base64-encoded string');
  }

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to a 32-byte value');
  }

  return key;
}

export interface EncryptedData {
  encryptedText: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  try {
    const masterKey = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedText: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData): string {
  try {
    const masterKey = getMasterKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random master key for development
 * This should only be used for initial setup
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
