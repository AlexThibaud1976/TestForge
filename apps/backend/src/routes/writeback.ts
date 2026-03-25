import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { writebackHistory } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { WritebackService } from '../services/writeback/WritebackService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const writebackService = new WritebackService();

// POST /api/analyses/:id/writeback
router.post('/analyses/:id/writeback', requireAuth, async (req: Request, res) => {
  const { teamId, userId } = req as AuthenticatedRequest;
  const analysisId = req.params['id'] as string;

  const parsed = z.object({
    fields: z.object({
      description: z.boolean().default(true),
      acceptanceCriteria: z.boolean().default(true),
    }).default({}),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const result = await writebackService.writeback(analysisId, teamId, userId, parsed.data.fields);
  res.json(result);
});

// GET /api/user-stories/:id/writeback-history
router.get('/user-stories/:id/writeback-history', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const history = await db
    .select()
    .from(writebackHistory)
    .where(and(eq(writebackHistory.userStoryId, req.params['id'] as string), eq(writebackHistory.teamId, teamId)));
  res.json(history);
});

export default router;
