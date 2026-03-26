import { describe, it, expect } from 'vitest';
import { diffAcceptanceCriteria } from './diffAC.js';
import { computeStoryHash } from './storyHash.js';

describe('diffAcceptanceCriteria', () => {
  it('détecte les AC ajoutés', () => {
    const oldAC = 'User can login\nUser sees dashboard';
    const newAC = 'User can login\nUser sees dashboard\nUser can logout';
    const diff = diffAcceptanceCriteria(oldAC, newAC);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]).toContain('logout');
    expect(diff.removed).toHaveLength(0);
  });

  it('détecte les AC supprimés', () => {
    const oldAC = 'User can login\nUser sees dashboard\nUser can reset password';
    const newAC = 'User can login\nUser sees dashboard';
    const diff = diffAcceptanceCriteria(oldAC, newAC);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]).toContain('reset password');
    expect(diff.added).toHaveLength(0);
  });

  it('retourne changePercent 0 si aucun changement', () => {
    const ac = 'User can login\nUser sees dashboard';
    const diff = diffAcceptanceCriteria(ac, ac);
    expect(diff.changePercent).toBe(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('gère les AC null (pas d\'AC)', () => {
    const diff = diffAcceptanceCriteria(null, null);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changePercent).toBe(0);
  });

  it('retourne changePercent élevé quand beaucoup changent', () => {
    const oldAC = 'AC1\nAC2\nAC3\nAC4\nAC5';
    const newAC = 'AC1\nAC6\nAC7\nAC8\nAC9';
    const diff = diffAcceptanceCriteria(oldAC, newAC);
    expect(diff.changePercent).toBeGreaterThan(50);
  });

  it('ignore les lignes vides et les titres (# ...)', () => {
    const oldAC = '# Acceptance Criteria\nUser can login\n\nUser sees dashboard';
    const newAC = 'User can login\nUser sees dashboard\nUser can logout';
    const diff = diffAcceptanceCriteria(oldAC, newAC);
    expect(diff.added).toHaveLength(1);
  });
});

describe('computeStoryHash', () => {
  it('retourne un hash stable pour le même contenu', () => {
    const h1 = computeStoryHash('description', 'AC1\nAC2');
    const h2 = computeStoryHash('description', 'AC1\nAC2');
    expect(h1).toBe(h2);
  });

  it('retourne un hash différent si le contenu change', () => {
    const h1 = computeStoryHash('description', 'AC1\nAC2');
    const h2 = computeStoryHash('description', 'AC1\nAC2\nAC3');
    expect(h1).not.toBe(h2);
  });

  it('gère les valeurs null', () => {
    const h = computeStoryHash(null, null);
    expect(h).toHaveLength(64); // SHA-256 hex = 64 chars
  });
});
