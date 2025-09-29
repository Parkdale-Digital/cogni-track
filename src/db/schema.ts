import { pgTable, text, timestamp, serial, integer, decimal } from "drizzle-orm/pg-core";

// Users table to store Clerk user IDs
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk User ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Encrypted API keys for providers
export const providerKeys = pgTable("provider_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(), // e.g., 'openai'
  encryptedKey: text("encrypted_key").notNull(),
  iv: text("iv").notNull(), // Initialization Vector for AES-256-GCM
  authTag: text("auth_tag").notNull(), // Auth Tag for AES-256-GCM
  usageMode: text("usage_mode").default("standard").notNull(),
  encryptedMetadata: text("encrypted_metadata"),
  metadataIv: text("metadata_iv"),
  metadataAuthTag: text("metadata_auth_tag"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Individual usage events
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => providerKeys.id, { onDelete: 'cascade' }),
  model: text("model").notNull(), // e.g., 'gpt-4-turbo'
  tokensIn: integer("tokens_in").default(0),
  tokensOut: integer("tokens_out").default(0),
  costEstimate: decimal("cost_estimate", { precision: 10, scale: 6 }).default("0"),
  timestamp: timestamp("timestamp").notNull(),
});
