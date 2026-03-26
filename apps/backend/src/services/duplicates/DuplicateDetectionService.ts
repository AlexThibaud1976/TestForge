import { eq, and, or, ne } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { userStories, duplicatePairs, llmConfigs } from '../../db/schema.js';
import { createLLMClient } from '../llm/index.js';
import { decrypt } from '../../utils/encryption.js';

const SIMILARITY_THRESHOLD = 0.85;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DuplicatePairResult {
  id: string;
  similarity: number;
  status: string;
  storyA: { id: string; externalId: string; title: string; description: string | null; acceptanceCriteria: string | null };
  storyB: { id: string; externalId: string; title: string; description: string | null; acceptanceCriteria: string | null };
}

// ─── Calcul de cosine similarity ─────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Fallback : similarité Jaccard sur les mots (quand embed() non disponible).
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 0; // pas de mots significatifs → non comparable
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class DuplicateDetectionService {
  /**
   * Calcule et stocke l'embedding d'une US.
   * Non bloquant — les erreurs sont ignorées silencieusement.
   */
  async computeEmbedding(storyId: string, teamId: string): Promise<void> {
    const [story] = await db
      .select()
      .from(userStories)
      .where(and(eq(userStories.id, storyId), eq(userStories.teamId, teamId)))
      .limit(1);

    if (!story) return;

    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) return;

    const client = createLLMClient({
      provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
      model: llmConfig.model,
      apiKey: decrypt(llmConfig.encryptedApiKey),
      ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
      ...(llmConfig.ollamaEndpoint ? { ollamaEndpoint: llmConfig.ollamaEndpoint } : {}),
    });

    if (!client.embedSupported?.() || !client.embed) return; // pas de support

    const text = [story.title, story.description, story.acceptanceCriteria]
      .filter(Boolean)
      .join('\n\n');

    try {
      const embedding = await client.embed(text);
      await db
        .update(userStories)
        .set({ embedding })
        .where(eq(userStories.id, storyId));
    } catch {
      // silencieux
    }
  }

  /**
   * Compare toutes les US d'une équipe et insère les paires similaires.
   * Appelé de manière asynchrone après chaque sync.
   */
  async detectDuplicates(teamId: string): Promise<number> {
    const stories = await db
      .select({
        id: userStories.id,
        externalId: userStories.externalId,
        title: userStories.title,
        description: userStories.description,
        acceptanceCriteria: userStories.acceptanceCriteria,
        embedding: userStories.embedding,
      })
      .from(userStories)
      .where(eq(userStories.teamId, teamId));

    let detected = 0;

    for (let i = 0; i < stories.length; i++) {
      for (let j = i + 1; j < stories.length; j++) {
        const a = stories[i]!;
        const b = stories[j]!;

        let similarity: number;

        if (a.embedding && b.embedding) {
          // Cosine similarity via embeddings
          similarity = cosineSimilarity(a.embedding as number[], b.embedding as number[]);
        } else {
          // Fallback Jaccard sur le texte
          const textA = `${a.title} ${a.description ?? ''} ${a.acceptanceCriteria ?? ''}`;
          const textB = `${b.title} ${b.description ?? ''} ${b.acceptanceCriteria ?? ''}`;
          similarity = jaccardSimilarity(textA, textB);
        }

        if (similarity >= SIMILARITY_THRESHOLD) {
          // Upsert : si la paire existe déjà → ne pas recréer
          const existing = await db
            .select({ id: duplicatePairs.id })
            .from(duplicatePairs)
            .where(and(
              eq(duplicatePairs.teamId, teamId),
              or(
                and(eq(duplicatePairs.storyAId, a.id), eq(duplicatePairs.storyBId, b.id)),
                and(eq(duplicatePairs.storyAId, b.id), eq(duplicatePairs.storyBId, a.id)),
              ),
            ))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(duplicatePairs).values({
              teamId,
              storyAId: a.id,
              storyBId: b.id,
              similarity,
              status: 'detected',
            });
            detected++;
          }
        }
      }
    }

    return detected;
  }

  /**
   * Retourne les paires non ignorées pour une équipe.
   */
  async getDuplicates(teamId: string): Promise<DuplicatePairResult[]> {
    const pairs = await db
      .select()
      .from(duplicatePairs)
      .where(and(eq(duplicatePairs.teamId, teamId), eq(duplicatePairs.status, 'detected')))
      .orderBy(duplicatePairs.similarity);

    if (pairs.length === 0) return [];

    // Charger les US associées
    const storyIds = new Set<string>();
    pairs.forEach((p) => { storyIds.add(p.storyAId); storyIds.add(p.storyBId); });

    const stories = await db
      .select({
        id: userStories.id,
        externalId: userStories.externalId,
        title: userStories.title,
        description: userStories.description,
        acceptanceCriteria: userStories.acceptanceCriteria,
      })
      .from(userStories)
      .where(eq(userStories.teamId, teamId));

    const storyMap = new Map(stories.map((s) => [s.id, s]));

    return pairs
      .map((p) => {
        const storyA = storyMap.get(p.storyAId);
        const storyB = storyMap.get(p.storyBId);
        if (!storyA || !storyB) return null;
        return {
          id: p.id,
          similarity: p.similarity,
          status: p.status,
          storyA,
          storyB,
        };
      })
      .filter((p): p is DuplicatePairResult => p !== null);
  }

  /**
   * Marque une paire comme ignorée.
   */
  async ignorePair(pairId: string, teamId: string): Promise<void> {
    await db
      .update(duplicatePairs)
      .set({ status: 'ignored' })
      .where(and(eq(duplicatePairs.id, pairId), eq(duplicatePairs.teamId, teamId)));
  }
}
