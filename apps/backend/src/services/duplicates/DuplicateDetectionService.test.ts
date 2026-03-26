import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), query: { llmConfigs: { findFirst: vi.fn() } } },
}));
vi.mock('../llm/index.js', () => ({ createLLMClient: vi.fn() }));
vi.mock('../../utils/encryption.js', () => ({ decrypt: vi.fn((v: string) => v) }));

import { cosineSimilarity, jaccardSimilarity, DuplicateDetectionService } from './DuplicateDetectionService.js';

describe('cosineSimilarity', () => {
  it('retourne 1.0 pour des vecteurs identiques', () => {
    const v = [1, 0, 1, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  it('retourne ~0 pour des vecteurs orthogonaux', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('retourne 0 pour des vecteurs vides', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('retourne 0 pour des vecteurs de longueur différente', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('valeur entre 0 et 1 pour des vecteurs similaires', () => {
    const a = [0.9, 0.1, 0.5];
    const b = [0.8, 0.2, 0.6];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.85);
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});

describe('jaccardSimilarity', () => {
  it('retourne 1.0 pour des textes identiques', () => {
    const t = 'user can login to the application';
    expect(jaccardSimilarity(t, t)).toBeCloseTo(1.0);
  });

  it('retourne 0 pour des textes sans mots communs', () => {
    expect(jaccardSimilarity('foo bar baz', 'qux quux corge')).toBe(0);
  });

  it('retourne ~0.5 pour des textes moitié similaires', () => {
    const sim = jaccardSimilarity('user can login to the app', 'user can logout from the system');
    expect(sim).toBeGreaterThan(0.1);
    expect(sim).toBeLessThan(1.0);
  });

  it('ignorer les mots courts (≤ 2 chars)', () => {
    // "to", "an", "is" etc. sont filtrés
    const sim = jaccardSimilarity('to an is', 'by or at');
    expect(sim).toBe(0); // aucun mot commun assez long
  });
});

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new DuplicateDetectionService();
    mockDb = (await import('../../db/index.js')).db;
  });

  describe('getDuplicates()', () => {
    it('retourne une liste vide si aucune paire', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      });
      const result = await service.getDuplicates('t-1');
      expect(result).toHaveLength(0);
    });
  });

  describe('ignorePair()', () => {
    it('met à jour le statut à "ignored"', async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.update.mockReturnValue({ set: mockSet });

      await service.ignorePair('pair-1', 't-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith({ status: 'ignored' });
    });
  });
});
