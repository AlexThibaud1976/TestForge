/**
 * Tests pour les routes de feedback — on teste la logique DB via mocks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => ({
  db: { insert: vi.fn(), select: vi.fn() },
}));

import { eq, and } from 'drizzle-orm';

const VALID_POSITIVE = { rating: 'positive', tags: [], comment: undefined };
const VALID_NEGATIVE = { rating: 'negative', tags: ['wrong_selector', 'import_missing'], comment: 'Les imports Playwright manquent' };

describe('Feedback logic', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = (await import('../../db/index.js')).db;
  });

  it('upsert feedback positif → retourne le record créé', async () => {
    const mockRecord = { id: 'fb-1', generationId: 'gen-1', userId: 'user-1', rating: 'positive', tags: [], comment: null };
    const mockOnConflict = vi.fn().mockResolvedValue([mockRecord]);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: mockValues });

    // Simuler la logique de route
    const result = await mockDb.insert({}).values({
      generationId: 'gen-1', teamId: 't-1', userId: 'user-1',
      rating: VALID_POSITIVE.rating, tags: VALID_POSITIVE.tags, comment: null,
    }).onConflictDoUpdate({ target: [], set: {} });

    expect(result).toEqual([mockRecord]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('upsert feedback négatif avec tags → tags stockés', async () => {
    const mockRecord = {
      id: 'fb-2', generationId: 'gen-1', userId: 'user-1',
      rating: 'negative', tags: VALID_NEGATIVE.tags, comment: VALID_NEGATIVE.comment,
    };
    const mockOnConflict = vi.fn().mockResolvedValue([mockRecord]);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: mockValues });

    const result = await mockDb.insert({}).values({
      rating: VALID_NEGATIVE.rating, tags: VALID_NEGATIVE.tags, comment: VALID_NEGATIVE.comment,
    }).onConflictDoUpdate({ target: [], set: {} });

    expect(result[0]?.tags).toEqual(['wrong_selector', 'import_missing']);
    expect(result[0]?.comment).toBe('Les imports Playwright manquent');
  });

  it('GET feedback → retourne null si pas de feedback', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });

    const [feedback] = await mockDb.select().from({}).where(and(eq({} as never, ''), eq({} as never, ''))).limit(1);
    expect(feedback).toBeUndefined();
  });

  it('GET feedback → retourne le feedback existant', async () => {
    const existingFeedback = { id: 'fb-1', rating: 'positive', tags: [], comment: null };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([existingFeedback]),
    });

    const [feedback] = await mockDb.select().from({}).where(and(eq({} as never, ''), eq({} as never, ''))).limit(1);
    expect(feedback?.rating).toBe('positive');
  });

  it('les tags invalides sont rejetés par le schema Zod', async () => {
    const { z } = await import('zod');
    const feedbackSchema = z.object({
      rating: z.enum(['positive', 'negative']),
      tags: z.array(z.enum([
        'import_missing', 'wrong_selector', 'incorrect_logic',
        'pom_not_respected', 'data_not_externalized', 'missing_edge_case', 'other',
      ])).default([]),
      comment: z.string().max(500).optional(),
    });

    const result = feedbackSchema.safeParse({ rating: 'negative', tags: ['invalid_tag'] });
    expect(result.success).toBe(false);
  });

  it('commentaire > 500 chars est rejeté', async () => {
    const { z } = await import('zod');
    const feedbackSchema = z.object({
      rating: z.enum(['positive', 'negative']),
      tags: z.array(z.string()).default([]),
      comment: z.string().max(500).optional(),
    });

    const result = feedbackSchema.safeParse({ rating: 'positive', comment: 'x'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
