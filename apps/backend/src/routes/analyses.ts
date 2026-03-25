import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { analyses } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AnalysisService } from '../services/analysis/AnalysisService.js';
import { BatchAnalysisService } from '../services/analysis/BatchAnalysisService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const analysisService = new AnalysisService();
const batchAnalysisService = new BatchAnalysisService(analysisService);

// POST /api/analyses  { userStoryId }
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({ userStoryId: z.string().uuid() }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await analysisService.analyze(parsed.data.userStoryId, teamId);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/analyses/:id
router.get('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const analysis = await db.query.analyses.findFirst({
    where: and(
      eq(analyses.id, req.params['id'] as string),
      eq(analyses.teamId, teamId),
    ),
  });

  if (!analysis) {
    res.status(404).json({ error: 'Analysis not found' });
    return;
  }

  res.json(analysis);
});

// GET /api/analyses?userStoryId=... — dernière analyse d'une US
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const userStoryId = req.query['userStoryId'] as string | undefined;

  if (!userStoryId) {
    res.status(400).json({ error: 'userStoryId query param required' });
    return;
  }

  const analysis = await db.query.analyses.findFirst({
    where: and(
      eq(analyses.userStoryId, userStoryId),
      eq(analyses.teamId, teamId),
    ),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  res.json(analysis ?? null);
});

// POST /api/analyses/batch  { userStoryIds: string[] }
router.post('/batch', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    userStoryIds: z.array(z.string().uuid()).min(1).max(50),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await batchAnalysisService.analyzeBatch(parsed.data.userStoryIds, teamId);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Batch analysis failed';
    res.status(500).json({ error: message });
  }
});

export default router;
