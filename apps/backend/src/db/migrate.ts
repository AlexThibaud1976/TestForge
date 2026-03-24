import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

const client = postgres(dbUrl, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations applied successfully');
await client.end();
