import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Cell: () => null,
  LabelList: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ProjectBreakdown } from './ProjectBreakdown.js';

const connections = [
  {
    connectionId: 'conn-1',
    connectionName: 'Backend Jira',
    connectionType: 'jira',
    averageScore: 72,
    analysisCount: 10,
    generationCount: 8,
  },
  {
    connectionId: 'conn-2',
    connectionName: 'ADO Frontend',
    connectionType: 'azure_devops',
    averageScore: 55,
    analysisCount: 5,
    generationCount: 3,
  },
];

describe('ProjectBreakdown', () => {
  it('should render connection names', () => {
    render(<ProjectBreakdown connections={connections} />);
    expect(screen.getAllByText(/Backend Jira/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ADO Frontend/).length).toBeGreaterThan(0);
  });

  it('should render the bar chart', () => {
    render(<ProjectBreakdown connections={connections} />);
    expect(screen.getByTestId('bar-chart')).toBeDefined();
  });

  it('should render analysis and generation counts', () => {
    render(<ProjectBreakdown connections={connections} />);
    expect(screen.getByText(/10 analyse/)).toBeDefined();
    expect(screen.getByText(/8 test/)).toBeDefined();
  });

  it('should show Jira icon for jira connections', () => {
    render(<ProjectBreakdown connections={[connections[0]!]} />);
    expect(screen.getAllByText(/🔵/).length).toBeGreaterThan(0);
  });

  it('should show ADO icon for azure_devops connections', () => {
    render(<ProjectBreakdown connections={[connections[1]!]} />);
    expect(screen.getAllByText(/🟣/).length).toBeGreaterThan(0);
  });

  it('should return null when connections is empty', () => {
    const { container } = render(<ProjectBreakdown connections={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
