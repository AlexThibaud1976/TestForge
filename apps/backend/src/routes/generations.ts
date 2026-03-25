import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { generations, generatedFiles, gitPushes, xrayTests, adoTestCases, xrayConfigs, analyses, userStories, sourceConnections } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { GenerationService } from '../services/generation/GenerationService.js';
import { GitPushService } from '../services/git/GitPushService.js';
import { handleCreateXrayTest } from './xray.js';
import { ADOConnector } from '../services/connectors/ADOConnector.js';
import { decrypt } from '../utils/encryption.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();
const generationService = new GenerationService();

// POST /api/generations  { analysisId, useImprovedVersion? }
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const parsed = z.object({
    analysisId: z.string().uuid(),
    useImprovedVersion: z.boolean().default(false),
    framework: z.enum(['playwright', 'selenium']).default('playwright'),
    language: z.enum(['typescript', 'javascript', 'python', 'java', 'csharp']).default('typescript'),
    manualTestSetId: z.string().uuid().optional(),
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
      parsed.data.manualTestSetId,
    );

    // Lancer la génération en arrière-plan — Realtime notifie le frontend
    void generationService.processGeneration(pending.id, pending.analysisId, teamId,
      parsed.data.useImprovedVersion, parsed.data.framework, parsed.data.language,
      parsed.data.manualTestSetId);

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
    where: and(eq(generations.id, req.params['id'] as string), eq(generations.teamId, teamId)),
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
    where: and(eq(generations.id, req.params['id'] as string), eq(generations.teamId, teamId)),
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

// POST /api/generations/:id/push
router.post('/:id/push', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    gitConfigId: z.string().uuid(),
    mode: z.enum(['commit', 'pr']),
    branchName: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
    const service = new GitPushService();
    const result = await service.push({ generationId: req.params['id'] as string, teamId, ...parsed.data });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[push]', message);
    res.status(500).json({ error: message });
  }
});

// GET /api/generations/:id/push-history
router.get('/:id/push-history', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const history = await db
    .select()
    .from(gitPushes)
    .where(and(eq(gitPushes.generationId, req.params['id'] as string), eq(gitPushes.teamId, teamId)));
  res.json(history);
});

// POST /api/generations/:id/xray  (T035b)
router.post('/:id/xray', requireAuth, handleCreateXrayTest);

// POST /api/generations/:id/ado-test-case  (T038)
router.post('/:id/ado-test-case', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const generationId = req.params['id'] as string;

  const parsed = z.object({
    testPlanId: z.number().optional(),
    testSuiteId: z.number().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  try {
  const [generation] = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  if (!generation || generation.teamId !== teamId) { res.status(404).json({ error: 'Generation not found' }); return; }

  const [analysis] = await db.select().from(analyses).where(eq(analyses.id, generation.analysisId!)).limit(1);
  if (!analysis?.userStoryId) { res.status(400).json({ error: 'No user story linked' }); return; }

  const [story] = await db.select().from(userStories).where(eq(userStories.id, analysis.userStoryId)).limit(1);
  if (!story?.connectionId) { res.status(404).json({ error: 'User story or connection not found' }); return; }

  const [connection] = await db.select().from(sourceConnections).where(eq(sourceConnections.id, story.connectionId)).limit(1);
  if (!connection || connection.type !== 'azure_devops') { res.status(400).json({ error: 'ADO connection required' }); return; }

  const credentials = JSON.parse(decrypt(connection.encryptedCredentials)) as Record<string, string>;
  const ado = new ADOConnector({ organizationUrl: connection.baseUrl, project: connection.projectKey, pat: credentials['pat']! });

  const steps = (story.acceptanceCriteria ?? '').split('\n')
    .filter((l) => l.trim())
    .map((l) => ({ action: l.trim(), expectedResult: 'Vérification conforme' }));

  const testCaseId = await ado.createTestCase(`[TestForge] ${story.title}`, steps);

  if (parsed.data.testPlanId && parsed.data.testSuiteId) {
    await ado.addTestCaseToSuite(parsed.data.testPlanId, parsed.data.testSuiteId, testCaseId);
  }

  const [record] = await db
    .insert(adoTestCases)
    .values({ generationId, teamId, testCaseId, testSuiteId: parsed.data.testSuiteId ?? null, testPlanId: parsed.data.testPlanId ?? null })
    .returning();

  res.status(201).json(record);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[ado-test-case]', message);
    res.status(500).json({ error: message });
  }
});

export default router;
