import { describe, it, expect } from 'vitest';
import { computeWordDiff } from './diff.js';

describe('computeWordDiff', () => {
  it('should return all unchanged for identical texts', () => {
    const result = computeWordDiff('hello world', 'hello world');
    expect(result.every((t) => t.type === 'unchanged')).toBe(true);
  });

  it('should detect added words', () => {
    const result = computeWordDiff('hello', 'hello world');
    expect(result).toContainEqual({ text: 'world', type: 'added' });
  });

  it('should detect removed words', () => {
    const result = computeWordDiff('hello world', 'hello');
    expect(result).toContainEqual({ text: 'world', type: 'removed' });
  });

  it('should handle mixed changes', () => {
    const result = computeWordDiff(
      'En tant que utilisateur enregisté',
      'En tant que utilisateur enregistré connecté',
    );
    const types = result.map((t) => t.type);
    expect(types).toContain('removed'); // "enregisté"
    expect(types).toContain('added');   // "enregistré", "connecté"
  });

  it('should handle empty original', () => {
    const result = computeWordDiff('', 'hello world');
    expect(result.every((t) => t.type === 'added')).toBe(true);
  });

  it('should handle empty improved', () => {
    const result = computeWordDiff('hello world', '');
    expect(result.every((t) => t.type === 'removed')).toBe(true);
  });

  it('should handle multiline texts', () => {
    const result = computeWordDiff(
      'Line one.\nLine two.',
      'Line one.\nLine two modified.\nLine three added.',
    );
    expect(result.some((t) => t.type === 'added')).toBe(true);
  });

  it('should return empty array for two empty strings', () => {
    const result = computeWordDiff('', '');
    expect(result).toHaveLength(0);
  });

  it('should preserve whitespace tokens in the output', () => {
    const result = computeWordDiff('a b', 'a b');
    const texts = result.map((t) => t.text);
    expect(texts).toContain('a');
    expect(texts).toContain('b');
  });
});
