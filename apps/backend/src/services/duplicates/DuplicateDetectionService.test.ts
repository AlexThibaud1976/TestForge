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

  describe('computeEmbedding()', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockCreateLLMClient: any;

    beforeEach(async () => {
      const llmModule = await import('../llm/index.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateLLMClient = (llmModule as any).createLLMClient;
    });

    it('returns early when story is not found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });
      await service.computeEmbedding('s-1', 't-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns early when no default LLM config exists', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 's1', title: 'Login', description: null, acceptanceCriteria: null }]),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue(undefined);
      await service.computeEmbedding('s-1', 't-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('returns early when the LLM client does not support embed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 's1', title: 'Login', description: null, acceptanceCriteria: null }]),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue({
        provider: 'openai', model: 'gpt-4', encryptedApiKey: 'key', azureEndpoint: null, ollamaEndpoint: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockCreateLLMClient.mockReturnValue({ embedSupported: () => false });
      await service.computeEmbedding('s-1', 't-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('stores embedding when embed is supported', async () => {
      const mockEmbed = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 's1', title: 'Login', description: 'desc', acceptanceCriteria: 'AC' }]),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue({
        provider: 'openai', model: 'gpt-4', encryptedApiKey: 'key', azureEndpoint: null, ollamaEndpoint: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockCreateLLMClient.mockReturnValue({ embedSupported: () => true, embed: mockEmbed });
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.update.mockReturnValue({ set: mockSet });

      await service.computeEmbedding('s-1', 't-1');
      expect(mockEmbed).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith({ embedding: [0.1, 0.2, 0.3] });
    });

    it('silently ignores errors thrown by embed()', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 's1', title: 'Login', description: null, acceptanceCriteria: null }]),
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue({
        provider: 'openai', model: 'gpt-4', encryptedApiKey: 'key', azureEndpoint: null, ollamaEndpoint: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockCreateLLMClient.mockReturnValue({
        embedSupported: () => true,
        embed: vi.fn().mockRejectedValue(new Error('network error')),
      });
      await expect(service.computeEmbedding('s-1', 't-1')).resolves.toBeUndefined();
    });
  });

  describe('detectDuplicates()', () => {
    it('returns 0 when there are no stories', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });
      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(0);
    });

    it('returns 0 when there is only one story', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 's1', externalId: 'US-1', title: 'Login story', description: null, acceptanceCriteria: null, embedding: null },
        ]),
      });
      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(0);
    });

    it('inserts a duplicate pair when Jaccard similarity exceeds threshold', async () => {
      const text = 'User can authenticate into the application using valid credentials';
      const makeStory = (id: string, ext: string) => ({
        id, externalId: ext, title: text, description: text, acceptanceCriteria: text, embedding: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([makeStory('s1', 'US-1'), makeStory('s2', 'US-2')]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
    });

    it('does not insert when the pair already exists', async () => {
      const text = 'User can authenticate into the application using valid credentials';
      const makeStory = (id: string, ext: string) => ({
        id, externalId: ext, title: text, description: text, acceptanceCriteria: text, embedding: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([makeStory('s1', 'US-1'), makeStory('s2', 'US-2')]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ id: 'existing-pair' }]) }),
        });

      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('uses cosine similarity when embeddings are present', async () => {
      const emb = [1, 0, 1, 0];
      const makeStory = (id: string, ext: string) => ({
        id, externalId: ext, title: 'A', description: null, acceptanceCriteria: null, embedding: emb,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([makeStory('s1', 'US-1'), makeStory('s2', 'US-2')]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });

      // cosine([1,0,1,0], [1,0,1,0]) = 1.0 >= 0.85 → detected
      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(1);
    });

    it('does not insert when similarity is below threshold', async () => {
      const storyA = { id: 's1', externalId: 'US-1', title: 'completely different alpha topic', description: null, acceptanceCriteria: null, embedding: null };
      const storyB = { id: 's2', externalId: 'US-2', title: 'unrelated zeta omega subject matter', description: null, acceptanceCriteria: null, embedding: null };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([storyA, storyB]),
      });

      const count = await service.detectDuplicates('t-1');
      expect(count).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
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

    it('returns populated pairs when stories are found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([
            { id: 'pair-1', storyAId: 's1', storyBId: 's2', similarity: 0.9, status: 'detected' },
          ]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            { id: 's1', externalId: 'US-1', title: 'Story A', description: null, acceptanceCriteria: null },
            { id: 's2', externalId: 'US-2', title: 'Story B', description: null, acceptanceCriteria: null },
          ]),
        });

      const results = await service.getDuplicates('t-1');
      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBe('pair-1');
      expect(results[0]!.storyA.title).toBe('Story A');
      expect(results[0]!.storyB.title).toBe('Story B');
    });

    it('filters out pairs where a referenced story is missing', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([
            { id: 'pair-1', storyAId: 's1', storyBId: 's-missing', similarity: 0.9, status: 'detected' },
          ]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([
            { id: 's1', externalId: 'US-1', title: 'Story A', description: null, acceptanceCriteria: null },
            // s-missing absent from DB results
          ]),
        });

      const results = await service.getDuplicates('t-1');
      expect(results).toHaveLength(0);
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
