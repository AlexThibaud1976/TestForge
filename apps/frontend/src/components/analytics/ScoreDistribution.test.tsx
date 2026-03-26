import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ScoreDistribution } from './ScoreDistribution.js';

describe('ScoreDistribution', () => {
  it('should render the average score in the center', () => {
    render(
      <ScoreDistribution
        distribution={{ green: 5, yellow: 3, red: 2 }}
        averageScore={72}
      />,
    );
    expect(screen.getByTestId('center-score').textContent).toBe('72');
  });

  it('should display counts for green, yellow, red', () => {
    render(
      <ScoreDistribution
        distribution={{ green: 5, yellow: 3, red: 2 }}
        averageScore={65}
      />,
    );
    expect(screen.getByTestId('green-count').textContent).toBe('5');
    expect(screen.getByTestId('yellow-count').textContent).toBe('3');
    expect(screen.getByTestId('red-count').textContent).toBe('2');
  });

  it('should render the pie chart', () => {
    render(
      <ScoreDistribution
        distribution={{ green: 10, yellow: 0, red: 0 }}
        averageScore={80}
      />,
    );
    expect(screen.getByTestId('pie-chart')).toBeDefined();
  });

  it('should handle all-zero distribution without crashing', () => {
    render(
      <ScoreDistribution
        distribution={{ green: 0, yellow: 0, red: 0 }}
        averageScore={0}
      />,
    );
    expect(screen.getByTestId('center-score').textContent).toBe('0');
  });
});
