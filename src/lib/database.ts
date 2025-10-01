import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

type DrizzleInstance = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __drizzleDb__?: DrizzleInstance;
};

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
  if (!globalForDb.__drizzleDb__) {
    globalForDb.__drizzleDb__ = createDb();
  }

  return globalForDb.__drizzleDb__;
}

export { schema };
