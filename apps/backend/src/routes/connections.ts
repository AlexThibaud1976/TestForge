import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { sourceConnections } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { JiraConnector } from '../services/connectors/JiraConnector.js';
import { ADOConnector } from '../services/connectors/ADOConnector.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

const jiraSchema = z.object({
  type: z.literal('jira'),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  email: z.string().email(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
  xrayClientId: z.string().optional(),
  xrayClientSecret: z.string().optional(),
});

const adoSchema = z.object({
  type: z.literal('azure_devops'),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  pat: z.string().min(1),
  project: z.string().min(1),
});

const createSchema = z.discriminatedUnion('type', [jiraSchema, adoSchema]);

// GET /api/connections
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const rows = await db
    .select({
      id: sourceConnections.id,
      type: sourceConnections.type,
      name: sourceConnections.name,
      baseUrl: sourceConnections.baseUrl,
      projectKey: sourceConnections.projectKey,
      isActive: sourceConnections.isActive,
      lastSyncAt: sourceConnections.lastSyncAt,
      createdAt: sourceConnections.createdAt,
      xrayClientId: sourceConnections.xrayClientId, // exposé (pas un secret)
    })
    .from(sourceConnections)
    .where(eq(sourceConnections.teamId, teamId));

  // hasXray = true si les deux credentials Xray sont présents
  res.json(rows.map((r) => ({ ...r, hasXray: !!(r.xrayClientId) })));
});

// POST /api/connections
router.post('/', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Construire les credentials à chiffrer
  const credentials =
    data.type === 'jira'
      ? JSON.stringify({ email: data.email, apiToken: data.apiToken })
      : JSON.stringify({ pat: data.pat });

  const projectKey = data.type === 'jira' ? data.projectKey : data.project;

  // Chiffrer le secret Xray si fourni (uniquement pour Jira)
  const xrayClientId = data.type === 'jira' && data.xrayClientId ? data.xrayClientId : null;
  const xrayClientSecret = data.type === 'jira' && data.xrayClientSecret ? encrypt(data.xrayClientSecret) : null;

  const [created] = await db
    .insert(sourceConnections)
    .values({
      teamId,
      type: data.type,
      name: data.name,
      baseUrl: data.baseUrl,
      encryptedCredentials: encrypt(credentials),
      projectKey,
      xrayClientId,
      xrayClientSecret,
    })
    .returning();

  res.status(201).json({
    id: created?.id,
    type: created?.type,
    name: created?.name,
    baseUrl: created?.baseUrl,
    projectKey: created?.projectKey,
    isActive: created?.isActive,
    createdAt: created?.createdAt,
    xrayClientId: created?.xrayClientId,
    hasXray: !!(created?.xrayClientId),
  });
});

// POST /api/connections/:id/test
router.post('/:id/test', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const connection = await db.query.sourceConnections.findFirst({
    where: and(
      eq(sourceConnections.id, req.params['id'] as string),
      eq(sourceConnections.teamId, teamId),
    ),
  });

  if (!connection) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  try {
    const credentials = JSON.parse(decrypt(connection.encryptedCredentials)) as Record<string, string>;

    if (connection.type === 'jira') {
      const connector = new JiraConnector({
        baseUrl: connection.baseUrl,
        email: credentials['email']!,
        apiToken: credentials['apiToken']!,
        projectKey: connection.projectKey,
      });
      await connector.testConnection();
    } else {
      const connector = new ADOConnector({
        organizationUrl: connection.baseUrl,
        project: connection.projectKey,
        pat: credentials['pat']!,
      });
      await connector.testConnection();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Connection test failed',
    });
  }
});

// PUT /api/connections/:id/xray — configure ou retire les credentials Xray d'une connexion Jira
router.put('/:id/xray', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    clientId: z.string().min(1).nullable(),
    clientSecret: z.string().min(1).nullable(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { clientId, clientSecret } = parsed.data;

  const [connection] = await db
    .select({ type: sourceConnections.type })
    .from(sourceConnections)
    .where(and(eq(sourceConnections.id, req.params['id'] as string), eq(sourceConnections.teamId, teamId)))
    .limit(1);

  if (!connection) { res.status(404).json({ error: 'Connection not found' }); return; }
  if (connection.type !== 'jira') { res.status(400).json({ error: 'Xray is only available for Jira connections' }); return; }

  const [updated] = await db
    .update(sourceConnections)
    .set({
      xrayClientId: clientId,
      xrayClientSecret: clientSecret ? encrypt(clientSecret) : null,
    })
    .where(and(eq(sourceConnections.id, req.params['id'] as string), eq(sourceConnections.teamId, teamId)))
    .returning({ id: sourceConnections.id, xrayClientId: sourceConnections.xrayClientId });

  res.json({ id: updated?.id, xrayClientId: updated?.xrayClientId, hasXray: !!(updated?.xrayClientId) });
});

// DELETE /api/connections/:id
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const deleted = await db
    .delete(sourceConnections)
    .where(
      and(
        eq(sourceConnections.id, req.params['id'] as string),
        eq(sourceConnections.teamId, teamId),
      ),
    )
    .returning({ id: sourceConnections.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: 'Connection not found' });
    return;
  }

  res.status(204).send();
});

export default router;
