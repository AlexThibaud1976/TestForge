import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffViewerUnified } from './DiffViewerUnified.js';
import type { DiffToken } from '../../utils/diff.js';

const tokens: DiffToken[] = [
  { text: 'En ', type: 'unchanged' },
  { text: 'tant', type: 'removed' },
  { text: 'bien', type: 'added' },
  { text: ' que', type: 'unchanged' },
];

describe('DiffViewerUnified', () => {
  it('should render all token texts', () => {
    render(<DiffViewerUnified tokens={tokens} />);
    expect(screen.getByText('tant')).toBeDefined();
    expect(screen.getByText('bien')).toBeDefined();
  });

  it('should apply green background to added tokens', () => {
    render(<DiffViewerUnified tokens={tokens} />);
    const added = screen.getByText('bien');
    expect(added.className).toContain('bg-green-100');
    expect(added.className).toContain('text-green-800');
  });

  it('should apply red background and line-through to removed tokens', () => {
    render(<DiffViewerUnified tokens={tokens} />);
    const removed = screen.getByText('tant');
    expect(removed.className).toContain('bg-red-100');
    expect(removed.className).toContain('line-through');
  });

  it('should render unchanged tokens without color classes', () => {
    const { container } = render(<DiffViewerUnified tokens={tokens} />);
    // Find spans that are NOT styled (unchanged tokens)
    const allSpans = Array.from(container.querySelectorAll('span'));
    const unstyled = allSpans.filter(
      (s) =>
        !s.className.includes('bg-green') &&
        !s.className.includes('bg-red') &&
        !s.className.includes('line-through'),
    );
    expect(unstyled.length).toBeGreaterThan(0);
  });

  it('should render empty div for empty tokens array', () => {
    const { container } = render(<DiffViewerUnified tokens={[]} />);
    expect(container.firstChild?.childNodes.length).toBe(0);
  });
});
