import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

let cachedDb: ReturnType<typeof drizzle> | null = null;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Please provide a connection string before accessing the database.'
    );
  }

  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!cachedDb) {
    cachedDb = createDb();
  }

  return cachedDb;
}

export { schema };