import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
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

export default router;
