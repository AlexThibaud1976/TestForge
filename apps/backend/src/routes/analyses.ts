import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { analyses } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AnalysisService } from '../services/analysis/AnalysisService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const analysisService = new AnalysisService();

// ── Sémaphore de concurrence ──────────────────────────────────────────────────

async function withConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Set<Promise<void>> = new Set();

  for (const task of tasks) {
    const p: Promise<void> = task().then(
      (value) => { results.push({ status: 'fulfilled', value }); },
      (reason: unknown) => { results.push({ status: 'rejected', reason }); },
    ).then(() => { executing.delete(p); });
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/analyses/batch  { userStoryIds } — DOIT être AVANT /:id
// Retourne 202 immédiatement, traitement en background (max 3 LLM en parallèle)
router.post('/batch', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    userStoryIds: z.array(z.string().uuid()).min(1).max(50),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const batchId = randomUUID();
  const { userStoryIds } = parsed.data;

  // Réponse immédiate — 202 Accepted
  res.status(202).json({ batchId, total: userStoryIds.length });

  // Traitement background — max 3 LLM calls simultanés
  const tasks = userStoryIds.map((id) => () => analysisService.analyze(id, teamId));
  void withConcurrencyLimit(tasks, 3);
});

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

export default router;
