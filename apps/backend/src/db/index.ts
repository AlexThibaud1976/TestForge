import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env['SUPABASE_URL']
  ? `${process.env['SUPABASE_URL']}/rest/v1/` // Supabase direct connection
  : process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('Missing SUPABASE_URL or DATABASE_URL environment variable');
}

// Pour Supabase, utiliser la connection string PostgreSQL directe
// Format : postgresql://postgres.[ref]:[password]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
const dbUrl = process.env['DATABASE_URL'] ?? connectionString;

const client = postgres(dbUrl, {
  prepare: false,  // requis pour Supabase pooler
  max: 5,          // évite de saturer les connexions Supabase (plan gratuit = 2 directes, pooler = plus)
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });

export type Database = typeof db;
