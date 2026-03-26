import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBarChart } from './ScoreBarChart';

const scores = { clarity: 80, completeness: 60, testability: 70, edgeCases: 40, acceptanceCriteria: 90 };

describe('ScoreBarChart', () => {
  it('renders 5 bars', () => {
    const { container } = render(<ScoreBarChart scores={scores} />);
    expect(container.querySelectorAll('[data-testid="bar-row"]')).toHaveLength(5);
  });

  it('displays all 5 labels', () => {
    render(<ScoreBarChart scores={scores} />);
    expect(screen.getByText('Clarté')).toBeInTheDocument();
    expect(screen.getByText('Complétude')).toBeInTheDocument();
    expect(screen.getByText('Testabilité')).toBeInTheDocument();
    expect(screen.getByText('Cas limites')).toBeInTheDocument();
    expect(screen.getByText('Critères AC')).toBeInTheDocument();
  });

  it('bar width is proportional to score', () => {
    const { container } = render(<ScoreBarChart scores={scores} />);
    const fills = container.querySelectorAll('[data-testid="bar-fill"]');
    const clarityFill = fills[0] as HTMLElement;
    expect(clarityFill.style.width).toBe('80%');
  });

  it('score > 70 → green fill', () => {
    const { container } = render(<ScoreBarChart scores={{ ...scores, clarity: 80 }} />);
    const fill = container.querySelectorAll('[data-testid="bar-fill"]')[0] as HTMLElement;
    expect(fill.className).toMatch(/green/);
  });

  it('score 40-70 → amber fill', () => {
    const { container } = render(<ScoreBarChart scores={{ ...scores, clarity: 60 }} />);
    const fill = container.querySelectorAll('[data-testid="bar-fill"]')[0] as HTMLElement;
    expect(fill.className).toMatch(/amber/);
  });

  it('score < 40 → red fill', () => {
    const { container } = render(<ScoreBarChart scores={{ ...scores, clarity: 25 }} />);
    const fill = container.querySelectorAll('[data-testid="bar-fill"]')[0] as HTMLElement;
    expect(fill.className).toMatch(/red/);
  });

  it('score = 0 → bar fill has 0% width', () => {
    const { container } = render(<ScoreBarChart scores={{ ...scores, clarity: 0 }} />);
    const fill = container.querySelectorAll('[data-testid="bar-fill"]')[0] as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('displays numeric score value', () => {
    render(<ScoreBarChart scores={scores} />);
    expect(screen.getByText('80')).toBeInTheDocument();
  });
});
