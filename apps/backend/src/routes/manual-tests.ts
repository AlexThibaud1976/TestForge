import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { manualTestSets, manualTestCases, sourceConnections } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { ManualTestService } from '../services/manual-tests/ManualTestService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const manualTestService = new ManualTestService();

const generateSchema = z.object({
  useImprovedVersion: z.boolean().default(false),
});

const updateSchema = z.object({
  testCases: z.array(z.object({
    id: z.string().uuid().nullable().optional(),
    title: z.string().min(1),
    precondition: z.string().nullable().optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.enum(['happy_path', 'error_case', 'edge_case', 'other']),
    steps: z.array(z.object({
      action: z.string().min(1),
      expectedResult: z.string().min(1),
    })).min(1),
    sortOrder: z.number().optional(),
  })),
});

const pushSchema = z.object({
  target: z.enum(['xray', 'ado']),
});

// POST /api/analyses/:id/manual-tests — génération
router.post('/analyses/:id/manual-tests', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const analysisId = req.params['id'] as string;
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const result = await manualTestService.generate(analysisId, teamId, parsed.data.useImprovedVersion);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

// GET /api/analyses/:id/manual-tests — récupération du dernier set
router.get('/analyses/:id/manual-tests', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const analysisId = req.params['id'] as string;

  try {
    const result = await manualTestService.getByAnalysis(analysisId, teamId);
    if (!result) { res.status(404).json({ error: 'No manual test set found for this analysis' }); return; }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// PUT /api/manual-test-sets/:id — mise à jour des test cases
router.put('/manual-test-sets/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const setId = req.params['id'] as string;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const result = await manualTestService.update(setId, teamId, parsed.data.testCases);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// POST /api/manual-test-sets/:id/validate — validation du lot
router.post('/manual-test-sets/:id/validate', requireAuth, async (req: Request, res) => {
  const { teamId, userId } = req as AuthenticatedRequest;
  const setId = req.params['id'] as string;

  try {
    const result = await manualTestService.validate(setId, teamId, userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(message.includes('not found') ? 404 : 400).json({ error: message });
  }
});

// POST /api/manual-test-sets/:id/regenerate — régénération
router.post('/manual-test-sets/:id/regenerate', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const setId = req.params['id'] as string;
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    // Charger l'analysisId depuis le set
    const [set] = await db
      .select({ analysisId: manualTestSets.analysisId })
      .from(manualTestSets)
      .where(and(eq(manualTestSets.id, setId), eq(manualTestSets.teamId, teamId)))
      .limit(1);
    if (!set) { res.status(404).json({ error: 'Manual test set not found' }); return; }

    const result = await manualTestService.regenerate(set.analysisId, teamId, parsed.data.useImprovedVersion);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/manual-test-sets/:id/push — push vers Xray ou ADO
router.post('/manual-test-sets/:id/push', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const setId = req.params['id'] as string;
  const parsed = pushSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    let pushResult;
    if (parsed.data.target === 'xray') {
      pushResult = await manualTestService.pushToXray(setId, teamId);
    } else {
      pushResult = await manualTestService.pushToADO(setId, teamId);
    }
    res.json(pushResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[manual-tests push]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
