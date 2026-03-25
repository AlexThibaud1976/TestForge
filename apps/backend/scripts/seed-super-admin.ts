/**
 * Seed script — insère le premier super_admin en base.
 * Usage: SUPER_ADMIN_SEED_USER_ID=<supabase-user-uuid> pnpm --filter backend tsx scripts/seed-super-admin.ts
 */
import 'dotenv/config';
import { db } from '../src/db/index.js';
import { superAdmins } from '../src/db/schema.js';

const userId = process.env['SUPER_ADMIN_SEED_USER_ID'];
if (!userId) {
  console.error('❌ SUPER_ADMIN_SEED_USER_ID environment variable is required');
  process.exit(1);
}

const [existing] = await db
  .select()
  .from(superAdmins)
  .where(
    (await import('drizzle-orm')).eq(superAdmins.userId, userId),
  )
  .limit(1);

if (existing) {
  console.log(`ℹ️  User ${userId} is already a super admin.`);
  process.exit(0);
}

await db.insert(superAdmins).values({ userId });
console.log(`✅ Super admin created for user ${userId}`);
process.exit(0);
