import { Router } from 'express';
import { z } from 'zod';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userStories, sourceConnections, generations, generatedFiles } from '../db/schema.js';
import { desc } from 'drizzle-orm';
import { computeStoryHash } from '../utils/storyHash.js';
import { diffAcceptanceCriteria } from '../utils/diffAC.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { JiraConnector } from '../services/connectors/JiraConnector.js';
import { ADOConnector } from '../services/connectors/ADOConnector.js';
import { DuplicateDetectionService } from '../services/duplicates/DuplicateDetectionService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

// GET /api/user-stories?page=1&pageSize=20&search=...&status=...&connectionId=...
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const page = Math.max(1, Number(req.query['page'] ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query['pageSize'] ?? 20)));
  const search = req.query['search'] as string | undefined;
  const status = req.query['status'] as string | undefined;
  const connectionId = req.query['connectionId'] as string | undefined;

  const conditions = [eq(userStories.teamId, teamId)];
  if (search) {
    conditions.push(
      or(
        ilike(userStories.title, `%${search}%`),
        ilike(userStories.description, `%${search}%`),
      )!,
    );
  }
  if (status) conditions.push(eq(userStories.status, status));
  if (connectionId) conditions.push(eq(userStories.connectionId, connectionId));

  const where = and(...conditions);

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(userStories)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .orderBy(userStories.fetchedAt),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userStories)
      .where(where),
  ]);

  res.json({ data: rows, total: countResult[0]?.count ?? 0, page, pageSize });
});

// GET /api/user-stories/:id
router.get('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const story = await db.query.userStories.findFirst({
    where: and(
      eq(userStories.id, req.params['id'] as string),
      eq(userStories.teamId, teamId),
    ),
  });

  if (!story) {
    res.status(404).json({ error: 'User story not found' });
    return;
  }

  res.json(story);
});

// POST /api/user-stories/sync — Feature 009: accepte des filtres optionnels
const syncSchema = z.object({
  connectionId: z.string().uuid(),
  filters: z.object({
    sprint: z.string().optional(),
    statuses: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
  }).optional(),
});

router.post('/sync', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const connection = await db.query.sourceConnections.findFirst({
    where: and(
      eq(sourceConnections.id, parsed.data.connectionId),
      eq(sourceConnections.teamId, teamId),
    ),
  });

  if (!connection) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  const credentials = JSON.parse(decrypt(connection.encryptedCredentials)) as Record<string, string>;

  let fetchedRaw: Awaited<ReturnType<JiraConnector['fetchUserStories']>> = [];

  if (connection.type === 'jira') {
    const connector = new JiraConnector({
      baseUrl: connection.baseUrl,
      email: credentials['email']!,
      apiToken: credentials['apiToken']!,
      projectKey: connection.projectKey,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchedRaw = await connector.fetchUserStories(teamId, connection.id, parsed.data.filters as any);
  } else {
    const connector = new ADOConnector({
      organizationUrl: connection.baseUrl,
      project: connection.projectKey,
      pat: credentials['pat']!,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchedRaw = await connector.fetchUserStories(teamId, connection.id, parsed.data.filters as any);
  }

  const fetched: Omit<(typeof userStories.$inferInsert), 'id'>[] = fetchedRaw.map((f) => ({
    ...f,
    fetchedAt: new Date(f.fetchedAt),
  }));

  // Upsert : insérer ou mettre à jour si l'externalId existe déjà
  if (fetched.length > 0) {
    await db
      .insert(userStories)
      .values(fetched)
      .onConflictDoUpdate({
        target: [userStories.connectionId, userStories.externalId],
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          acceptanceCriteria: sql`excluded.acceptance_criteria`,
          labels: sql`excluded.labels`,
          status: sql`excluded.status`,
          fetchedAt: sql`now()`,
        },
      });
  }

  // Mettre à jour lastSyncAt
  await db
    .update(sourceConnections)
    .set({ lastSyncAt: new Date() })
    .where(eq(sourceConnections.id, connection.id));

  res.json({ synced: fetched.length });

  // Feature 010: calcul des embeddings + détection de doublons (async, non bloquant)
  const dupService = new DuplicateDetectionService();
  const syncedIds = fetched.map((s) => s.externalId);
  const newStoryIds = await db
    .select({ id: userStories.id })
    .from(userStories)
    .where(eq(userStories.teamId, teamId))
    .then((rows) => rows.map((r) => r.id).slice(0, 50)); // limiter à 50 pour ne pas surcharger

  void Promise.all(
    newStoryIds.map((id) => dupService.computeEmbedding(id, teamId).catch(() => undefined)),
  ).then(() => dupService.detectDuplicates(teamId).catch(() => undefined));
});

// GET /api/user-stories/:id/change-status — Feature 008: détection de changement
router.get('/:id/change-status', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const userStoryId = req.params['id'] as string;

  try {
    // Charger l'US
    const [story] = await db
      .select()
      .from(userStories)
      .where(and(eq(userStories.id, userStoryId), eq(userStories.teamId, teamId)))
      .limit(1);

    if (!story) { res.status(404).json({ error: 'User story not found' }); return; }

    // Charger la dernière génération réussie pour cette US (via analyse)
    const lastGeneration = await db
      .select({
        id: generations.id,
        sourceHash: generations.sourceHash,
        createdAt: generations.createdAt,
        analysisId: generations.analysisId,
      })
      .from(generations)
      .where(and(
        eq(generations.teamId, teamId),
        eq(generations.status, 'success'),
      ))
      .orderBy(desc(generations.createdAt))
      .limit(20) // chercher parmi les 20 dernières générations
      .then((rows) => rows[0]); // simplification v1 : prendre la plus récente

    if (!lastGeneration) {
      res.json({ changed: false, generationId: null, reason: 'no_previous_generation' });
      return;
    }

    // Comparer le hash actuel avec celui stocké à la génération
    const currentHash = computeStoryHash(story.description, story.acceptanceCriteria);

    if (!lastGeneration.sourceHash) {
      // Pas de hash stocké (génération avant la feature 008)
      // Utiliser fetchedAt vs createdAt comme fallback
      const changed = story.fetchedAt > lastGeneration.createdAt;
      res.json({ changed, generationId: lastGeneration.id, reason: 'no_hash_fallback_date' });
      return;
    }

    if (currentHash === lastGeneration.sourceHash) {
      res.json({ changed: false, generationId: lastGeneration.id });
      return;
    }

    // L'US a changé — calculer le diff AC
    // Pour le diff on a besoin de l'ancien contenu... on ne le stocke pas.
    // En v1, on retourne juste changed:true avec le changePercent estimé
    res.json({
      changed: true,
      generationId: lastGeneration.id,
      currentHash,
      previousHash: lastGeneration.sourceHash,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
