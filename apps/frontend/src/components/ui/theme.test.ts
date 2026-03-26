import { describe, it, expect } from 'vitest';
import { getScoreLevel, SCORE_COLORS, BRAND } from './theme';

describe('getScoreLevel', () => {
  it('returns "low" for scores < 40', () => {
    expect(getScoreLevel(0)).toBe('low');
    expect(getScoreLevel(39)).toBe('low');
  });
  it('returns "medium" for scores 40-70', () => {
    expect(getScoreLevel(40)).toBe('medium');
    expect(getScoreLevel(70)).toBe('medium');
  });
  it('returns "high" for scores > 70', () => {
    expect(getScoreLevel(71)).toBe('high');
    expect(getScoreLevel(100)).toBe('high');
  });
});

describe('SCORE_COLORS', () => {
  it('has valid hex colors for all levels', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const level of Object.values(SCORE_COLORS)) {
      expect(level.bg).toMatch(hexRegex);
      expect(level.text).toMatch(hexRegex);
      expect(level.accent).toMatch(hexRegex);
      expect(level.border).toMatch(hexRegex);
    }
  });
});

describe('BRAND', () => {
  it('has primary, secondary, and accent colors', () => {
    expect(BRAND.primary).toBeDefined();
    expect(BRAND.secondary).toBeDefined();
    expect(BRAND.accent).toBeDefined();
  });
});
