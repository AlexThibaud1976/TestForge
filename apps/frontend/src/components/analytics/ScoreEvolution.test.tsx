import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ScoreEvolution } from './ScoreEvolution.js';

describe('ScoreEvolution', () => {
  it('should render the line chart when data is available', () => {
    render(
      <ScoreEvolution
        weeklyScores={[
          { week: '2024-W01', averageScore: 70, count: 3 },
          { week: '2024-W02', averageScore: 75, count: 5 },
        ]}
      />,
    );
    expect(screen.getByTestId('line-chart')).toBeDefined();
  });

  it('should show empty message when no data', () => {
    render(<ScoreEvolution weeklyScores={[]} />);
    expect(screen.getByText('Pas encore de données')).toBeDefined();
  });

  it('should render the section title', () => {
    render(<ScoreEvolution weeklyScores={[]} />);
    expect(screen.getByText('Évolution hebdomadaire')).toBeDefined();
  });
});
