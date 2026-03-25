import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { teams, teamMembers, generations, analyses } from '../db/schema.js';
import { eq, sql, count, and, gte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superAdmin.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
router.use(requireAuth, requireSuperAdmin);

// GET /api/admin/teams
router.get('/teams', async (req: Request, res) => {
  const page = Number((req.query as Record<string, string>)['page'] ?? '1');
  const limit = Number((req.query as Record<string, string>)['limit'] ?? '20');
  const offset = (page - 1) * limit;

  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      plan: teams.plan,
      suspendedAt: teams.suspendedAt,
      trialEndsAt: teams.trialEndsAt,
      createdAt: teams.createdAt,
    })
    .from(teams)
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ total: count() }).from(teams);
  const total = totalResult[0]?.total ?? 0;

  res.json({ data: allTeams, total, page, limit });
});

// GET /api/admin/teams/:id
router.get('/teams/:id', async (req: Request, res) => {
  const teamId = req.params['id'] as string;

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  const members = await db
    .select({ userId: teamMembers.userId, role: teamMembers.role, joinedAt: teamMembers.joinedAt })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const recentGenerations = await db
    .select({ id: generations.id, framework: generations.framework, status: generations.status, createdAt: generations.createdAt })
    .from(generations)
    .where(eq(generations.teamId, teamId))
    .limit(10);

  res.json({ team, members, recentGenerations });
});

// POST /api/admin/teams/:id/suspend
router.post('/teams/:id/suspend', async (req: Request, res) => {
  const teamId = req.params['id'] as string;
  const [updated] = await db
    .update(teams)
    .set({ suspendedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning({ suspendedAt: teams.suspendedAt });

  if (!updated) { res.status(404).json({ error: 'Team not found' }); return; }
  res.json({ suspendedAt: updated.suspendedAt });
});

// POST /api/admin/teams/:id/reactivate
router.post('/teams/:id/reactivate', async (req: Request, res) => {
  const teamId = req.params['id'] as string;
  const [updated] = await db
    .update(teams)
    .set({ suspendedAt: null })
    .where(eq(teams.id, teamId))
    .returning({ suspendedAt: teams.suspendedAt });

  if (!updated) { res.status(404).json({ error: 'Team not found' }); return; }
  res.json({ suspendedAt: null });
});

// GET /api/admin/stats
router.get('/stats', async (_req, res) => {
  const [stats] = await db
    .select({
      totalTeams: count(),
    })
    .from(teams);

  const [activeCount] = await db
    .select({ count: count() })
    .from(teams)
    .where(sql`${teams.suspendedAt} IS NULL AND ${teams.plan} != 'trial'`);

  const [trialCount] = await db
    .select({ count: count() })
    .from(teams)
    .where(eq(teams.plan, 'trial'));

  const [suspendedCount] = await db
    .select({ count: count() })
    .from(teams)
    .where(sql`${teams.suspendedAt} IS NOT NULL`);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [genStats] = await db
    .select({ count: count() })
    .from(generations)
    .where(gte(generations.createdAt, startOfMonth));

  const [analysisStats] = await db
    .select({ count: count() })
    .from(analyses)
    .where(gte(analyses.createdAt, startOfMonth));

  res.json({
    totalTeams: stats?.totalTeams ?? 0,
    activeTeams: activeCount?.count ?? 0,
    trialTeams: trialCount?.count ?? 0,
    suspendedTeams: suspendedCount?.count ?? 0,
    totalGenerationsThisMonth: genStats?.count ?? 0,
    totalAnalysesThisMonth: analysisStats?.count ?? 0,
  });
});

export default router;
