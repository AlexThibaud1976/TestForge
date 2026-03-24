import { Router } from 'express';
import { z } from 'zod';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { userStories, sourceConnections } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { JiraConnector } from '../services/connectors/JiraConnector.js';
import { ADOConnector } from '../services/connectors/ADOConnector.js';
import type { Request } from 'express';

const router = Router();

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

  const [rows, [{ count }]] = await Promise.all([
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

  res.json({ data: rows, total: count, page, pageSize });
});

// GET /api/user-stories/:id
router.get('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const story = await db.query.userStories.findFirst({
    where: and(
      eq(userStories.id, req.params['id']!),
      eq(userStories.teamId, teamId),
    ),
  });

  if (!story) {
    res.status(404).json({ error: 'User story not found' });
    return;
  }

  res.json(story);
});

// POST /api/user-stories/sync
const syncSchema = z.object({ connectionId: z.string().uuid() });

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

  let fetched: Omit<(typeof userStories.$inferInsert), 'id'>[] = [];

  if (connection.type === 'jira') {
    const connector = new JiraConnector({
      baseUrl: connection.baseUrl,
      email: credentials['email']!,
      apiToken: credentials['apiToken']!,
      projectKey: connection.projectKey,
    });
    fetched = await connector.fetchUserStories(teamId, connection.id);
  } else {
    const connector = new ADOConnector({
      organizationUrl: connection.baseUrl,
      project: connection.projectKey,
      pat: credentials['pat']!,
    });
    fetched = await connector.fetchUserStories(teamId, connection.id);
  }

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
});

export default router;
