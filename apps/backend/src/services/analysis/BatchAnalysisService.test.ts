import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB to avoid requiring SUPABASE_URL at import time
vi.mock('../../db/index.js', () => ({ db: {} }));

import { BatchAnalysisService } from './BatchAnalysisService.js';
import type { AnalysisService } from './AnalysisService.js';

function makeAnalysis(userStoryId: string, score: number) {
  return {
    id: `analysis-${userStoryId}`,
    userStoryId,
    teamId: 't-1',
    scoreGlobal: score,
    scoreClarity: score,
    scoreCompleteness: score,
    scoreTestability: score,
    scoreEdgeCases: score,
    scoreAcceptanceCriteria: score,
    suggestions: [],
    improvedVersion: null,
    llmProvider: 'openai',
    llmModel: 'gpt-4o',
    promptVersion: 'v1.0',
    createdAt: new Date(),
  };
}

describe('BatchAnalysisService', () => {
  let mockAnalysisService: { analyze: ReturnType<typeof vi.fn> };
  let service: BatchAnalysisService;

  beforeEach(() => {
    mockAnalysisService = { analyze: vi.fn() };
    service = new BatchAnalysisService(mockAnalysisService as unknown as AnalysisService);
  });

  it('5 US → 5 résultats avec stats correctes', async () => {
    const ids = ['us-1', 'us-2', 'us-3', 'us-4', 'us-5'];
    const scores = [25, 55, 85, 42, 78];
    ids.forEach((id, i) => {
      mockAnalysisService.analyze.mockResolvedValueOnce(makeAnalysis(id, scores[i]!));
    });

    const result = await service.analyzeBatch(ids, 't-1');

    expect(result.results).toHaveLength(5);
    expect(result.stats.total).toBe(5);
    expect(result.stats.succeeded).toBe(5);
    expect(result.stats.failed).toBe(0);
    // mean = (25+55+85+42+78)/5 = 57
    expect(result.stats.meanScore).toBe(57);
    // red < 40: [25] = 1, orange 40-70: [55,42] = 2, green > 70: [85,78] = 2
    expect(result.stats.distribution.red).toBe(1);
    expect(result.stats.distribution.orange).toBe(2);
    expect(result.stats.distribution.green).toBe(2);
  });

  it('identifie les résultats en cache (réponse rapide)', async () => {
    const ids = ['us-1', 'us-2', 'us-3', 'us-4', 'us-5'];
    // 2 appels qui répondent immédiatement (< 100ms = cache)
    mockAnalysisService.analyze
      .mockResolvedValueOnce(makeAnalysis('us-1', 80)) // instant → cache
      .mockResolvedValueOnce(makeAnalysis('us-2', 60)) // instant → cache
      .mockImplementation(async (id: string) => {
        await new Promise((r) => setTimeout(r, 120)); // > 100ms → pas cache
        return makeAnalysis(id, 50);
      });

    const result = await service.analyzeBatch(ids, 't-1');

    expect(result.stats.fromCache).toBeGreaterThanOrEqual(2);
    expect(result.stats.succeeded).toBe(5);
  });

  it('1 US en erreur → 4 résultats + 1 erreur, les autres non bloquées', async () => {
    const ids = ['us-1', 'us-2', 'us-3', 'us-4', 'us-5'];
    mockAnalysisService.analyze.mockImplementation(async (id: string) => {
      if (id === 'us-3') throw new Error('LLM rate limit');
      return makeAnalysis(id, 70);
    });

    const result = await service.analyzeBatch(ids, 't-1');

    expect(result.stats.total).toBe(5);
    expect(result.stats.succeeded).toBe(4);
    expect(result.stats.failed).toBe(1);

    const failedItem = result.results.find((r) => r.userStoryId === 'us-3');
    expect(failedItem?.error).toBe('LLM rate limit');
    expect(failedItem?.analysis).toBeNull();

    const succeededItems = result.results.filter((r) => r.analysis !== null);
    expect(succeededItems).toHaveLength(4);
  });

  it('lance au maximum 3 appels simultanés (p-limit)', async () => {
    const concurrency: number[] = [];
    let activeCount = 0;
    let maxActive = 0;

    const ids = Array.from({ length: 9 }, (_, i) => `us-${i + 1}`);
    mockAnalysisService.analyze.mockImplementation(async (id: string) => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      concurrency.push(activeCount);
      await new Promise((r) => setTimeout(r, 20));
      activeCount--;
      return makeAnalysis(id, 60);
    });

    await service.analyzeBatch(ids, 't-1');

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('throw si tableau vide', async () => {
    await expect(service.analyzeBatch([], 't-1')).rejects.toThrow('At least one');
  });

  it('retourne meanScore null si tous en erreur', async () => {
    mockAnalysisService.analyze.mockRejectedValue(new Error('Fail'));
    const result = await service.analyzeBatch(['us-1', 'us-2'], 't-1');
    expect(result.stats.meanScore).toBeNull();
    expect(result.stats.failed).toBe(2);
  });
});
