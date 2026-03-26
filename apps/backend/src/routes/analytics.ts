import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams, analyses, generations, userStories, sourceConnections } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import { AnalyticsService } from '../services/analytics/AnalyticsService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const analyticsService = new AnalyticsService();

const periodSchema = z.enum(['month', 'quarter', 'all']).default('month');

const configSchema = z.object({
  analysisMinutes: z.number().int().min(1).max(1440),
  generationMinutes: z.number().int().min(1).max(1440),
  manualTestMinutes: z.number().int().min(1).max(1440),
});

// GET /api/analytics?period=month|quarter|all
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const periodResult = periodSchema.safeParse((req.query as Record<string, string>)['period'] ?? 'month');
  const period = periodResult.success ? periodResult.data : 'month';

  try {
    const metrics = await analyticsService.getMetrics(teamId, period);
    res.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analytics]', message);
    res.status(500).json({ error: message });
  }
});

// PATCH /api/analytics/config — mise à jour des coefficients de temps
router.patch('/config', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { analysisMinutes, generationMinutes, manualTestMinutes } = parsed.data;
  const [updated] = await db
    .update(teams)
    .set({
      analyticsCoefficients: {
        analysis: analysisMinutes,
        generation: generationMinutes,
        manualTest: manualTestMinutes,
      },
    })
    .where(eq(teams.id, teamId))
    .returning({ analyticsCoefficients: teams.analyticsCoefficients });

  res.json({ coefficients: updated?.analyticsCoefficients });
});

// GET /api/analytics/dashboard?connectionId=<uuid> — dashboard avec filtrage par connexion
router.get('/dashboard', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const connectionId = req.query['connectionId'] as string | undefined;

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  // Charger la config de l'équipe
  const [team] = await db
    .select({ manualTestMinutes: teams.manualTestMinutes })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  const manualTestMinutes = team?.manualTestMinutes ?? 30;

  const [kpiRows, distRows, weeklyRows, byConnRows, genRows] = await Promise.all([
    // 1. KPIs : score moyen + total analyses
    connectionId
      ? db.select({
          averageScore: sql<number>`COALESCE(ROUND(AVG(${analyses.scoreGlobal}))::int, 0)`,
          totalAnalyses: sql<number>`COUNT(*)::int`,
        }).from(analyses)
          .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
          .where(and(eq(analyses.teamId, teamId), eq(userStories.connectionId, connectionId)))
      : db.select({
          averageScore: sql<number>`COALESCE(ROUND(AVG(${analyses.scoreGlobal}))::int, 0)`,
          totalAnalyses: sql<number>`COUNT(*)::int`,
        }).from(analyses).where(eq(analyses.teamId, teamId)),

    // 2. Distribution : vert / jaune / rouge
    connectionId
      ? db.select({
          bucket: sql<string>`CASE WHEN ${analyses.scoreGlobal} >= 70 THEN 'green' WHEN ${analyses.scoreGlobal} >= 40 THEN 'yellow' ELSE 'red' END`,
          count: sql<number>`COUNT(*)::int`,
        }).from(analyses)
          .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
          .where(and(eq(analyses.teamId, teamId), eq(userStories.connectionId, connectionId)))
          .groupBy(sql`1`)
      : db.select({
          bucket: sql<string>`CASE WHEN ${analyses.scoreGlobal} >= 70 THEN 'green' WHEN ${analyses.scoreGlobal} >= 40 THEN 'yellow' ELSE 'red' END`,
          count: sql<number>`COUNT(*)::int`,
        }).from(analyses).where(eq(analyses.teamId, teamId)).groupBy(sql`1`),

    // 3. Évolution hebdomadaire (12 dernières semaines)
    connectionId
      ? db.select({
          week: sql<string>`TO_CHAR(${analyses.createdAt}, 'IYYY-"W"IW')`,
          averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
          count: sql<number>`COUNT(*)::int`,
        }).from(analyses)
          .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
          .where(and(eq(analyses.teamId, teamId), eq(userStories.connectionId, connectionId), gte(analyses.createdAt, twelveWeeksAgo)))
          .groupBy(sql`1`).orderBy(sql`1`)
      : db.select({
          week: sql<string>`TO_CHAR(${analyses.createdAt}, 'IYYY-"W"IW')`,
          averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
          count: sql<number>`COUNT(*)::int`,
        }).from(analyses)
          .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, twelveWeeksAgo)))
          .groupBy(sql`1`).orderBy(sql`1`),

    // 4. Répartition par connexion
    db.select({
      connectionId: sourceConnections.id,
      connectionName: sourceConnections.name,
      connectionType: sourceConnections.type,
      averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
      analysisCount: sql<number>`COUNT(DISTINCT ${analyses.id})::int`,
      generationCount: sql<number>`COUNT(DISTINCT ${generations.id})::int`,
    }).from(analyses)
      .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
      .innerJoin(sourceConnections, eq(userStories.connectionId, sourceConnections.id))
      .leftJoin(generations, eq(generations.analysisId, analyses.id))
      .where(connectionId
        ? and(eq(analyses.teamId, teamId), eq(sourceConnections.id, connectionId))
        : eq(analyses.teamId, teamId))
      .groupBy(sourceConnections.id, sourceConnections.name, sourceConnections.type)
      .orderBy(desc(sql`ROUND(AVG(${analyses.scoreGlobal}))`)),

    // 5. Générations réussies
    connectionId
      ? db.select({ total: sql<number>`COUNT(*)::int` })
          .from(generations)
          .innerJoin(analyses, eq(generations.analysisId, analyses.id))
          .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
          .where(and(eq(generations.teamId, teamId), eq(generations.status, 'success'), eq(userStories.connectionId, connectionId)))
      : db.select({ total: sql<number>`COUNT(*)::int` })
          .from(generations)
          .where(and(eq(generations.teamId, teamId), eq(generations.status, 'success'))),
  ]);

  const kpi = kpiRows[0] ?? { averageScore: 0, totalAnalyses: 0 };
  const distribution = { green: 0, yellow: 0, red: 0 };
  for (const row of distRows) {
    if (row.bucket === 'green') distribution.green = row.count;
    else if (row.bucket === 'yellow') distribution.yellow = row.count;
    else if (row.bucket === 'red') distribution.red = row.count;
  }
  const totalGens = genRows[0]?.total ?? 0;

  res.json({
    kpis: {
      averageScore: kpi.averageScore ?? 0,
      totalAnalyses: kpi.totalAnalyses ?? 0,
      totalGenerations: totalGens,
      manualTestMinutes,
      timeSavedMinutes: totalGens * manualTestMinutes,
    },
    distribution,
    weeklyScores: weeklyRows,
    byConnection: byConnRows,
  });
});

// PUT /api/analytics/test-estimate — met à jour le temps moyen par test (admin seulement)
router.put('/test-estimate', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    manualTestMinutes: z.number().int().min(5).max(240),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  await db
    .update(teams)
    .set({ manualTestMinutes: parsed.data.manualTestMinutes })
    .where(eq(teams.id, teamId));

  res.json({ manualTestMinutes: parsed.data.manualTestMinutes });
});

export default router;
