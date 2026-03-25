import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { PomRegistryService } from '../services/generation/PomRegistryService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const pomRegistryService = new PomRegistryService();

// GET /api/pom-registry
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  try {
    const poms = await pomRegistryService.listPom(teamId);
    res.json(poms);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/pom-registry/:id
router.delete('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  try {
    await pomRegistryService.deletePom(req.params['id'] as string, teamId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
