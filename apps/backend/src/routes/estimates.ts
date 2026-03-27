import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { llmConfigs } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { EstimateService } from '../services/estimates/EstimateService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const estimateService = new EstimateService();

const querySchema = z.object({
  type: z.enum(['analysis', 'generation']),
  provider: z.string().optional(),
  model: z.string().optional(),
});

// GET /api/estimates?type=analysis&provider=openai&model=gpt-4o
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = querySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let { provider, model } = parsed.data;
  const { type } = parsed.data;

  // Si provider/model absents → config LLM default de l'équipe
  if (!provider || !model) {
    const defaultConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    provider = defaultConfig?.provider ?? 'openai';
    model = defaultConfig?.model ?? 'gpt-4o';
  }

  const estimate = await estimateService.getEstimate(type, provider, model, teamId);
  res.json(estimate);
});

export default router;
