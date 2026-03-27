import { describe, it, expect, vi, beforeEach } from 'vitest';

// Les mocks doivent être définis AVANT l'import du module via vi.hoisted
const { mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect };
});

vi.mock('../../db/index.js', () => ({
  db: { select: mockSelect },
}));

vi.mock('../../db/schema.js', () => ({
  analyses: {},
  generations: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  isNotNull: vi.fn(),
  desc: vi.fn(),
  ne: vi.fn(),
  gt: vi.fn(),
}));

import { EstimateService } from './EstimateService.js';

describe('EstimateService', () => {
  let service: EstimateService;

  beforeEach(() => {
    service = new EstimateService();
    vi.clearAllMocks();
    // Reconfigurer la chaîne après clearAllMocks
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
  });

  describe('getEstimate — default fallback', () => {
    it('returns default 15000ms for analysis when no data', async () => {
      const result = await service.getEstimate('analysis', 'openai', 'gpt-4o', 'team-1');
      expect(result.source).toBe('default');
      expect(result.estimatedMs).toBe(15000);
      expect(result.sampleSize).toBe(0);
    });

    it('returns default 25000ms for generation when no data', async () => {
      const result = await service.getEstimate('generation', 'openai', 'gpt-4o', 'team-1');
      expect(result.source).toBe('default');
      expect(result.estimatedMs).toBe(25000);
    });
  });

  describe('getEstimate — team source (≥5 entries)', () => {
    it('returns team median when ≥5 team entries', async () => {
      const teamData = [
        { durationMs: 10000 }, { durationMs: 12000 }, { durationMs: 11000 },
        { durationMs: 9000 }, { durationMs: 13000 },
      ];
      mockLimit.mockResolvedValueOnce(teamData);

      const result = await service.getEstimate('analysis', 'openai', 'gpt-4o', 'team-1');
      expect(result.source).toBe('team');
      expect(result.estimatedMs).toBe(11000); // médiane de [9000,10000,11000,12000,13000]
      expect(result.sampleSize).toBe(5);
    });
  });

  describe('getEstimate — global source (<5 team, ≥5 global)', () => {
    it('falls back to global when team < 5 but global ≥ 5', async () => {
      const teamData = [{ durationMs: 10000 }, { durationMs: 12000 }]; // < 5
      const globalData = [
        { durationMs: 8000 }, { durationMs: 9000 }, { durationMs: 10000 },
        { durationMs: 11000 }, { durationMs: 12000 },
      ];
      mockLimit
        .mockResolvedValueOnce(teamData)
        .mockResolvedValueOnce(globalData);

      const result = await service.getEstimate('analysis', 'openai', 'gpt-4o', 'team-1');
      expect(result.source).toBe('global');
      expect(result.estimatedMs).toBe(10000); // médiane de [8000,9000,10000,11000,12000]
    });
  });
});
