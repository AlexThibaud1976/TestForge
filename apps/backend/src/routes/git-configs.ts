import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { gitConfigs, gitPushes } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { GitHubAdapter } from '../services/git/GitHubAdapter.js';
import { GitLabAdapter } from '../services/git/GitLabAdapter.js';
import { AzureReposAdapter } from '../services/git/AzureReposAdapter.js';
import { GitPushService } from '../services/git/GitPushService.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

const createSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'azure_repos']),
  name: z.string().min(1),
  repoUrl: z.string().url(),
  token: z.string().min(1),
  defaultBranch: z.string().default('main'),
});

const pushSchema = z.object({
  gitConfigId: z.string().uuid(),
  mode: z.enum(['commit', 'pr']),
  branchName: z.string().optional(),
});

// GET /api/git-configs
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const configs = await db
    .select({
      id: gitConfigs.id,
      provider: gitConfigs.provider,
      name: gitConfigs.name,
      repoUrl: gitConfigs.repoUrl,
      defaultBranch: gitConfigs.defaultBranch,
      createdAt: gitConfigs.createdAt,
    })
    .from(gitConfigs)
    .where(eq(gitConfigs.teamId, teamId));
  res.json(configs);
});

// POST /api/git-configs
router.post('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { provider, name, repoUrl, token, defaultBranch } = parsed.data;
  const [config] = await db
    .insert(gitConfigs)
    .values({ teamId, provider, name, repoUrl, encryptedToken: encrypt(token), defaultBranch })
    .returning({
      id: gitConfigs.id,
      provider: gitConfigs.provider,
      name: gitConfigs.name,
      repoUrl: gitConfigs.repoUrl,
      defaultBranch: gitConfigs.defaultBranch,
      createdAt: gitConfigs.createdAt,
    });
  res.status(201).json(config);
});

// POST /api/git-configs/:id/test
router.post('/:id/test', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const [config] = await db
    .select()
    .from(gitConfigs)
    .where(and(eq(gitConfigs.id, req.params['id'] as string), eq(gitConfigs.teamId, teamId)))
    .limit(1);
  if (!config) { res.status(404).json({ error: 'Git config not found' }); return; }

  const token = decrypt(config.encryptedToken);
  let adapter;
  switch (config.provider) {
    case 'github': adapter = new GitHubAdapter(token, config.repoUrl); break;
    case 'gitlab': adapter = new GitLabAdapter(token, config.repoUrl); break;
    case 'azure_repos': adapter = new AzureReposAdapter(token, config.repoUrl); break;
    default: res.status(400).json({ error: 'Unknown provider' }); return;
  }
  const result = await adapter.testConnection();
  res.json(result);
});

// DELETE /api/git-configs/:id
router.delete('/:id', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const deleted = await db
    .delete(gitConfigs)
    .where(and(eq(gitConfigs.id, req.params['id'] as string), eq(gitConfigs.teamId, teamId)))
    .returning({ id: gitConfigs.id });
  if (deleted.length === 0) { res.status(404).json({ error: 'Git config not found' }); return; }
  res.status(204).send();
});

// Note: push and push-history routes are defined directly in generations.ts

export default router;
