import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { DuplicateDetectionService } from '../services/duplicates/DuplicateDetectionService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const dupService = new DuplicateDetectionService();

// GET /api/duplicates — liste des paires similaires de l'équipe
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  try {
    const pairs = await dupService.getDuplicates(teamId);
    res.json(pairs);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/duplicates/:id/ignore — ignorer une paire (faux positif)
router.post('/:id/ignore', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  try {
    await dupService.ignorePair(req.params['id'] as string, teamId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
