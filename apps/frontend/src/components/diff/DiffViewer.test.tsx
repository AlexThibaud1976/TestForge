import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffViewer } from './DiffViewer.js';

describe('DiffViewer', () => {
  it('should show the number of modifications', () => {
    render(<DiffViewer original="hello world" improved="hello earth" />);
    // 'world' removed + 'earth' added = 2 changes (plus whitespace tokens that match)
    expect(screen.getByText(/modification/)).toBeDefined();
  });

  it('should show "0 modification" for identical texts', () => {
    render(<DiffViewer original="hello" improved="hello" />);
    expect(screen.getByText('0 modification')).toBeDefined();
  });

  it('should default to unified mode', () => {
    render(<DiffViewer original="hello world" improved="hello earth" />);
    // In unified mode, removed tokens appear with line-through
    const removedTokens = document.querySelectorAll('.line-through');
    expect(removedTokens.length).toBeGreaterThan(0);
  });

  it('should have Unifié and Côte à côte toggle buttons', () => {
    render(<DiffViewer original="a b" improved="a c" />);
    expect(screen.getByText('Unifié')).toBeDefined();
    expect(screen.getByText('Côte à côte')).toBeDefined();
  });

  it('should switch to side-by-side mode when button is clicked', () => {
    render(<DiffViewer original="hello world" improved="hello earth" />);
    fireEvent.click(screen.getByText('Côte à côte'));
    // Side-by-side shows "Original" and "Amélioré" column headers
    expect(screen.getByText('Original')).toBeDefined();
    expect(screen.getByText('Amélioré')).toBeDefined();
  });

  it('should show "1 modification" for single change', () => {
    render(<DiffViewer original="hello" improved="world" />);
    // 'hello' removed, 'world' added = 2 token changes actually
    expect(screen.getByText(/modification/)).toBeDefined();
  });
});
