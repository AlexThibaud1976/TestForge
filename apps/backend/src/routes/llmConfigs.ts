import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { llmConfigs } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { createLLMClient } from '../services/llm/index.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

const createSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('openai'),
    model: z.string().default('gpt-4o'),
    apiKey: z.string().min(1),
  }),
  z.object({
    provider: z.literal('anthropic'),
    model: z.string().default('claude-3-5-sonnet-20241022'),
    apiKey: z.string().min(1),
  }),
  z.object({
    provider: z.literal('azure_openai'),
    model: z.string().min(1),
    apiKey: z.string().min(1),
    azureEndpoint: z.string().url(),
    azureDeployment: z.string().min(1),
  }),
  z.object({
    provider: z.literal('mistral'),
    model: z.string().default('mistral-large-latest'),
    apiKey: z.string().min(1),
  }),
  z.object({
    provider: z.literal('ollama'),
    model: z.string().min(1),
    ollamaEndpoint: z.string().url(),
  }),
]);

// GET /api/llm-configs
router.get('/', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const rows = await db
    .select({
      id: llmConfigs.id,
      provider: llmConfigs.provider,
      model: llmConfigs.model,
      azureEndpoint: llmConfigs.azureEndpoint,
      azureDeployment: llmConfigs.azureDeployment,
      ollamaEndpoint: llmConfigs.ollamaEndpoint,
      isDefault: llmConfigs.isDefault,
      createdAt: llmConfigs.createdAt,
    })
    .from(llmConfigs)
    .where(eq(llmConfigs.teamId, teamId));

  res.json(rows);
});

// POST /api/llm-configs
router.post('/', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  // Si c'est le premier, le mettre par défaut automatiquement
  const existing = await db.query.llmConfigs.findFirst({
    where: eq(llmConfigs.teamId, teamId),
  });
  const isDefault = !existing;

  // Ollama n'a pas de clé API — on stocke un placeholder
  const apiKeyToEncrypt = 'apiKey' in data ? data.apiKey : 'ollama-local';

  const [created] = await db
    .insert(llmConfigs)
    .values({
      teamId,
      provider: data.provider,
      model: data.model,
      encryptedApiKey: encrypt(apiKeyToEncrypt),
      azureEndpoint: 'azureEndpoint' in data ? data.azureEndpoint : null,
      azureDeployment: 'azureDeployment' in data ? data.azureDeployment : null,
      ollamaEndpoint: 'ollamaEndpoint' in data ? data.ollamaEndpoint : null,
      isDefault,
    })
    .returning();

  res.status(201).json({
    id: created?.id,
    provider: created?.provider,
    model: created?.model,
    azureEndpoint: created?.azureEndpoint,
    azureDeployment: created?.azureDeployment,
    ollamaEndpoint: created?.ollamaEndpoint,
    isDefault: created?.isDefault,
    createdAt: created?.createdAt,
  });
});

// POST /api/llm-configs/:id/test
router.post('/:id/test', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const config = await db.query.llmConfigs.findFirst({
    where: and(eq(llmConfigs.id, req.params['id'] as string), eq(llmConfigs.teamId, teamId)),
  });

  if (!config) {
    res.status(404).json({ error: 'LLM config not found' });
    return;
  }

  try {
    const client = createLLMClient({
      provider: config.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
      model: config.model,
      apiKey: decrypt(config.encryptedApiKey),
      ...(config.azureEndpoint ? { azureEndpoint: config.azureEndpoint } : {}),
      ...(config.azureDeployment ? { azureDeployment: config.azureDeployment } : {}),
      ...(config.ollamaEndpoint ? { ollamaEndpoint: config.ollamaEndpoint } : {}),
    });

    await client.complete([{ role: 'user', content: 'Reply with just the word OK.' }], {
      maxTokens: 10,
      temperature: 0,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Connection test failed',
    });
  }
});

// PATCH /api/llm-configs/:id
router.patch('/:id', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const patchSchema = z.object({
    model: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
    azureEndpoint: z.string().url().optional(),
    azureDeployment: z.string().min(1).optional(),
  });

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const updates: Partial<typeof llmConfigs.$inferInsert> = {};
  if (parsed.data.model) updates.model = parsed.data.model;
  if (parsed.data.apiKey) updates.encryptedApiKey = encrypt(parsed.data.apiKey);
  if (parsed.data.azureEndpoint) updates.azureEndpoint = parsed.data.azureEndpoint;
  if (parsed.data.azureDeployment) updates.azureDeployment = parsed.data.azureDeployment;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const [updated] = await db
    .update(llmConfigs)
    .set(updates)
    .where(and(eq(llmConfigs.id, req.params['id'] as string), eq(llmConfigs.teamId, teamId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: 'LLM config not found' });
    return;
  }

  res.json({
    id: updated.id,
    provider: updated.provider,
    model: updated.model,
    azureEndpoint: updated.azureEndpoint,
    azureDeployment: updated.azureDeployment,
    isDefault: updated.isDefault,
    createdAt: updated.createdAt,
  });
});

// PUT /api/llm-configs/:id/set-default
router.put('/:id/set-default', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  // Retirer l'ancien défaut
  await db
    .update(llmConfigs)
    .set({ isDefault: false })
    .where(eq(llmConfigs.teamId, teamId));

  // Définir le nouveau défaut
  const [updated] = await db
    .update(llmConfigs)
    .set({ isDefault: true })
    .where(and(eq(llmConfigs.id, req.params['id'] as string), eq(llmConfigs.teamId, teamId)))
    .returning({ id: llmConfigs.id });

  if (!updated) {
    res.status(404).json({ error: 'LLM config not found' });
    return;
  }

  res.json({ success: true });
});

// DELETE /api/llm-configs/:id
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  await db
    .delete(llmConfigs)
    .where(and(eq(llmConfigs.id, req.params['id'] as string), eq(llmConfigs.teamId, teamId)));
  res.status(204).send();
});

export default router;
