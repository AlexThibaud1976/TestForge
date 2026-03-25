import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { xrayConfigs, xrayTests, generations, analyses, userStories } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { XrayConnector } from '../services/xray/XrayConnector.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

// GET /api/xray-configs
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const [config] = await db
    .select({ id: xrayConfigs.id, projectKey: xrayConfigs.projectKey, createdAt: xrayConfigs.createdAt })
    .from(xrayConfigs)
    .where(eq(xrayConfigs.teamId, teamId))
    .limit(1);
  res.json(config ?? null);
});

// POST /api/xray-configs
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    projectKey: z.string().min(1),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { projectKey, clientId, clientSecret } = parsed.data;
  const encrypted = encrypt(JSON.stringify({ clientId, clientSecret }));

  // Upsert (unique per team)
  await db.delete(xrayConfigs).where(eq(xrayConfigs.teamId, teamId));
  const [config] = await db
    .insert(xrayConfigs)
    .values({ teamId, projectKey, encryptedCredentials: encrypted })
    .returning({ id: xrayConfigs.id, projectKey: xrayConfigs.projectKey });
  res.status(201).json(config);
});

// POST /api/xray-configs/test
router.post('/test', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const [config] = await db.select().from(xrayConfigs).where(eq(xrayConfigs.teamId, teamId)).limit(1);
  if (!config) { res.status(404).json({ error: 'Xray config not found' }); return; }

  const creds = JSON.parse(decrypt(config.encryptedCredentials)) as { clientId: string; clientSecret: string };
  const connector = new XrayConnector(creds);
  await connector.authenticate();
  res.json({ ok: true });
});

// DELETE /api/xray-configs/:id
router.delete('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const deleted = await db
    .delete(xrayConfigs)
    .where(and(eq(xrayConfigs.id, req.params['id'] as string), eq(xrayConfigs.teamId, teamId)))
    .returning({ id: xrayConfigs.id });
  if (deleted.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
  res.status(204).send();
});

// POST /api/generations/:id/xray  (re-exported as handler for generations router)
export async function handleCreateXrayTest(req: Request, res: any): Promise<void> {
  const { teamId } = req as AuthenticatedRequest;
  const generationId = req.params['id'] as string;

  const [generation] = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (!generation || generation.teamId !== teamId) { res.status(404).json({ error: 'Generation not found' }); return; }

  const [xrayConfig] = await db.select().from(xrayConfigs).where(eq(xrayConfigs.teamId, teamId)).limit(1);
  if (!xrayConfig) { res.status(400).json({ error: 'No Xray config found for this team' }); return; }

  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, generation.analysisId!)).limit(1);
  if (!analysis?.userStoryId) { res.status(400).json({ error: 'No user story linked to this generation' }); return; }

  const [story] = await db.select().from(userStories).where(eq(userStories.id, analysis.userStoryId)).limit(1);
  if (!story) { res.status(404).json({ error: 'User story not found' }); return; }

  const creds = JSON.parse(decrypt(xrayConfig.encryptedCredentials)) as { clientId: string; clientSecret: string };
  const connector = new XrayConnector(creds);

  const steps = connector.mapStepsFromAC(story.acceptanceCriteria ?? story.description ?? '');
  const created = await connector.createTest({
    projectKey: xrayConfig.projectKey,
    summary: `[TestForge] ${story.title}`,
    steps,
    requirementKey: (req.body as { requirementKey?: string }).requirementKey ?? story.externalId,
  });

  const [record] = await db
    .insert(xrayTests)
    .values({ generationId, teamId, xrayTestId: created.testId, xrayTestKey: created.testKey })
    .returning();

  res.status(201).json(record);
}

export default router;
