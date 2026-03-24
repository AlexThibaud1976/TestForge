import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { generations, generatedFiles } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { GenerationService } from '../services/generation/GenerationService.js';
import type { Request } from 'express';

const router = Router();
const generationService = new GenerationService();

// POST /api/generations  { analysisId, useImprovedVersion? }
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const parsed = z.object({
    analysisId: z.string().uuid(),
    useImprovedVersion: z.boolean().default(false),
    framework: z.enum(['playwright', 'selenium']).default('playwright'),
    language: z.enum(['typescript', 'javascript', 'python', 'java', 'csharp']).default('typescript'),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    // Créer le record pending et retourner immédiatement
    const pending = await generationService.createPending(
      parsed.data.analysisId,
      teamId,
      parsed.data.useImprovedVersion,
      parsed.data.framework,
      parsed.data.language,
    );

    // Lancer la génération en arrière-plan — Realtime notifie le frontend
    void generationService.processGeneration(pending.id, pending.analysisId, teamId,
      parsed.data.useImprovedVersion, parsed.data.framework, parsed.data.language);

    res.status(201).json(pending); // { id, status: 'pending' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/generations?analysisId=... — générations d'une analyse
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const analysisId = req.query['analysisId'] as string | undefined;

  const conditions = [eq(generations.teamId, teamId)];
  if (analysisId) conditions.push(eq(generations.analysisId, analysisId));

  const rows = await db
    .select()
    .from(generations)
    .where(and(...conditions))
    .orderBy(desc(generations.createdAt))
    .limit(50);

  res.json(rows);
});

// GET /api/generations/:id — avec fichiers
router.get('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const generation = await db.query.generations.findFirst({
    where: and(eq(generations.id, req.params['id']!), eq(generations.teamId, teamId)),
  });

  if (!generation) {
    res.status(404).json({ error: 'Generation not found' });
    return;
  }

  const files = await db
    .select()
    .from(generatedFiles)
    .where(eq(generatedFiles.generationId, generation.id));

  res.json({ ...generation, files });
});

// GET /api/generations/:id/download — ZIP
router.get('/:id/download', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const generation = await db.query.generations.findFirst({
    where: and(eq(generations.id, req.params['id']!), eq(generations.teamId, teamId)),
  });

  if (!generation) {
    res.status(404).json({ error: 'Generation not found' });
    return;
  }

  const files = await db
    .select()
    .from(generatedFiles)
    .where(eq(generatedFiles.generationId, generation.id));

  const zipFiles = files.map((f) => ({
    type: f.fileType as 'page_object' | 'test_spec' | 'fixtures',
    filename: f.filename,
    content: f.content,
  }));

  const buffer = await generationService.buildZip(zipFiles);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="testforge-${generation.id.slice(0, 8)}.zip"`);
  res.send(buffer);
});

export default router;
