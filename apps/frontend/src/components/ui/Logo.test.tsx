import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('showText=true (default) → displays "TestForge"', () => {
    render(<Logo showText />);
    expect(screen.getByText('TestForge')).toBeInTheDocument();
  });

  it('showText=false → does not display "TestForge"', () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText('TestForge')).toBeNull();
  });

  it('respects the size prop on the SVG', () => {
    const { container } = render(<Logo size={32} showText={false} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });
});
