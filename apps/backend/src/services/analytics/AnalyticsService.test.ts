import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './AnalyticsService.js';

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
    update: vi.fn(),
  },
}));

/** Crée un builder chaînable qui se résout avec `data` à chaque await */
function chain(data: unknown[]) {
  const self: Record<string, unknown> = {};
  const resolver = () => Promise.resolve(data);
  // Rend l'objet thenable
  self['then'] = (resolve: (v: unknown) => unknown) => resolver().then(resolve);
  self['catch'] = (reject: (e: unknown) => unknown) => resolver().catch(reject);
  const noop = () => self;
  self['from'] = noop;
  self['where'] = noop;
  self['groupBy'] = noop;
  self['innerJoin'] = noop;
  self['orderBy'] = noop;
  self['limit'] = noop;
  return self;
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AnalyticsService();
    mockDb = (await import('../../db/index.js')).db;

    const responses = [
      // 007: feedback query (ajoutée avant les counts)
      [{ rating: 'positive', tags: [] }, { rating: 'negative', tags: ['wrong_selector'] }], // 1. feedbacks
      [{ coefficients: null }],                                                // 2. team
      [{ count: 10 }],                                                        // 3. analysis count
      [{ count: 5 }],                                                         // 4. generation count
      [{ count: 3 }],                                                         // 5. manualTestSets count
      [{ count: 15 }],                                                        // 6. manualTestCases count
      [{ key: 'playwright+typescript', count: 4 }, { key: 'selenium+java', count: 1 }], // 7. frameworks
      [{ key: 'openai', count: 8 }, { key: 'anthropic', count: 2 }],          // 8. providers
      [{ id: 'us-1', title: 'Login', score: 85 }],                           // 9. best US
      [{ id: 'us-2', title: 'Register', score: 42 }],                        // 10. worst US
    ];

    let idx = 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => chain(responses[idx++] ?? []));

    // execute() est appelé 3x : scoreTrend, currentAvg, prevAvg — retourne des arrays (RowList itérable)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.execute
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .mockResolvedValueOnce([{ week: new Date('2026-03-01'), mean_score: 72, count: 5 }])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .mockResolvedValueOnce([{ avg: 72 }])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      .mockResolvedValueOnce([{ avg: 64 }]);
  });

  it('retourne les counts corrects', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.counts.analyses).toBe(10);
    expect(result.counts.generations).toBe(5);
    expect(result.counts.manualTestSets).toBe(3);
    expect(result.counts.manualTestCases).toBe(15);
  });

  it('calcule le temps gagné avec les coefficients par défaut', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.timeSaved.breakdown.analyses).toBe(10 * 30);
    expect(result.timeSaved.breakdown.generations).toBe(5 * 90);
    expect(result.timeSaved.breakdown.manualTests).toBe(3 * 45);
    expect(result.timeSaved.totalMinutes).toBe(10 * 30 + 5 * 90 + 3 * 45);
  });

  it('expose les coefficients par défaut', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.timeSaved.coefficients).toEqual({ analysis: 30, generation: 90, manualTest: 45 });
  });

  it('construit le scoreTrend depuis les résultats SQL', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.scoreTrend).toHaveLength(1);
    expect(result.scoreTrend[0]?.meanScore).toBe(72);
    expect(result.scoreTrend[0]?.count).toBe(5);
  });

  it('construit la distribution frameworks', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.distribution.frameworks['playwright+typescript']).toBe(4);
    expect(result.distribution.frameworks['selenium+java']).toBe(1);
  });

  it('construit la distribution providers', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.distribution.llmProviders['openai']).toBe(8);
    expect(result.distribution.llmProviders['anthropic']).toBe(2);
  });

  it('retourne les highlights best/worst', async () => {
    const result = await service.getMetrics('t-1', 'month');
    expect(result.highlights.bestScoredUS?.title).toBe('Login');
    expect(result.highlights.bestScoredUS?.score).toBe(85);
    expect(result.highlights.worstScoredUS?.score).toBe(42);
  });

  it('définit la période "month" sur ~30 jours', async () => {
    const result = await service.getMetrics('t-1', 'month');
    const from = new Date(result.period.from);
    const to = new Date(result.period.to);
    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(28);
    expect(diffDays).toBeLessThanOrEqual(31);
  });
});
