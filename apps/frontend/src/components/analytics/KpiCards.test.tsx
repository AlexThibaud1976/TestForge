import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KpiCards } from './KpiCards.js';

const baseProps = {
  averageScore: 72,
  totalAnalyses: 10,
  totalGenerations: 8,
  timeSavedMinutes: 240,
  manualTestMinutes: 30,
  onEditEstimate: vi.fn(),
};

describe('KpiCards', () => {
  it('should render all four kpi cards', () => {
    render(<KpiCards {...baseProps} />);
    expect(screen.getByText('72')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('4h')).toBeDefined(); // 240 min = 4h
  });

  it('should show green badge for score >= 70', () => {
    render(<KpiCards {...baseProps} averageScore={70} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.className).toContain('green');
  });

  it('should show yellow badge for score 40-69', () => {
    render(<KpiCards {...baseProps} averageScore={55} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.className).toContain('yellow');
  });

  it('should show red badge for score < 40', () => {
    render(<KpiCards {...baseProps} averageScore={35} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.className).toContain('red');
  });

  it('should display time saved in hours and minutes', () => {
    render(<KpiCards {...baseProps} timeSavedMinutes={90} />);
    expect(screen.getByText('1h 30min')).toBeDefined();
  });

  it('should show manualTestMinutes label', () => {
    render(<KpiCards {...baseProps} />);
    expect(screen.getByText('(30 min/test)')).toBeDefined();
  });

  it('should call onEditEstimate when edit button clicked', () => {
    const onEditEstimate = vi.fn();
    render(<KpiCards {...baseProps} onEditEstimate={onEditEstimate} />);
    fireEvent.click(screen.getByText('⚙️'));
    expect(onEditEstimate).toHaveBeenCalledOnce();
  });
});
