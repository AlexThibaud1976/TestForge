import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { pomTemplates } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

const createSchema = z.object({
  framework: z.string().min(1),
  language: z.string().min(1),
  content: z.string().min(1),
});

// GET /api/pom-templates
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const templates = await db
    .select()
    .from(pomTemplates)
    .where(eq(pomTemplates.teamId, teamId));
  res.json(templates);
});

// POST /api/pom-templates  (upsert par team + framework + language)
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { framework, language, content } = parsed.data;

  // Delete existing for this combo then insert (simpler than ON CONFLICT with Drizzle)
  await db.delete(pomTemplates).where(
    and(eq(pomTemplates.teamId, teamId), eq(pomTemplates.framework, framework), eq(pomTemplates.language, language)),
  );
  const [template] = await db
    .insert(pomTemplates)
    .values({ teamId, framework, language, content })
    .returning();
  res.status(201).json(template);
});

// DELETE /api/pom-templates/:id
router.delete('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const deleted = await db
    .delete(pomTemplates)
    .where(and(eq(pomTemplates.id, req.params['id'] as string), eq(pomTemplates.teamId, teamId)))
    .returning({ id: pomTemplates.id });
  if (deleted.length === 0) { res.status(404).json({ error: 'Template not found' }); return; }
  res.status(204).send();
});

export default router;
