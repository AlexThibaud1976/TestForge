import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBadge } from './ScoreBadge';

describe('ScoreBadge', () => {
  it('displays the score value', () => {
    render(<ScoreBadge score={82} />);
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('score=82 → green background classes', () => {
    const { container } = render(<ScoreBadge score={82} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/green/);
  });

  it('score=54 → amber/orange background classes', () => {
    const { container } = render(<ScoreBadge score={54} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/amber/);
  });

  it('score=28 → red background classes', () => {
    const { container } = render(<ScoreBadge score={28} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/red/);
  });

  it('score=70 → amber (not green, boundary exclusive)', () => {
    const { container } = render(<ScoreBadge score={70} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/amber/);
    expect(badge.className).not.toMatch(/green/);
  });

  it('score=71 → green', () => {
    const { container } = render(<ScoreBadge score={71} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/green/);
  });

  it('score=40 → amber (boundary inclusive)', () => {
    const { container } = render(<ScoreBadge score={40} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/amber/);
  });

  it('score=39 → red', () => {
    const { container } = render(<ScoreBadge score={39} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toMatch(/red/);
  });

  it('showDot=true (default) → dot element visible', () => {
    const { container } = render(<ScoreBadge score={75} showDot />);
    const dots = container.querySelectorAll('[data-testid="score-dot"]');
    expect(dots).toHaveLength(1);
  });

  it('showDot=false → no dot element', () => {
    const { container } = render(<ScoreBadge score={75} showDot={false} />);
    const dots = container.querySelectorAll('[data-testid="score-dot"]');
    expect(dots).toHaveLength(0);
  });
});
