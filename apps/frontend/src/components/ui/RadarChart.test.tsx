import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarChart } from './RadarChart';

const allMax = { clarity: 100, completeness: 100, testability: 100, edgeCases: 100, acceptanceCriteria: 100 };
const allZero = { clarity: 0, completeness: 0, testability: 0, edgeCases: 0, acceptanceCriteria: 0 };
const mixed = { clarity: 80, completeness: 60, testability: 70, edgeCases: 40, acceptanceCriteria: 90 };

describe('RadarChart', () => {
  it('renders an SVG element', () => {
    const { container } = render(<RadarChart scores={mixed} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('displays all 5 axis labels', () => {
    render(<RadarChart scores={mixed} />);
    expect(screen.getByText('Clarté')).toBeInTheDocument();
    expect(screen.getByText('Complétude')).toBeInTheDocument();
    expect(screen.getByText('Testabilité')).toBeInTheDocument();
    expect(screen.getByText('Cas limites')).toBeInTheDocument();
    expect(screen.getByText('Critères AC')).toBeInTheDocument();
  });

  it('renders 3 grid reference polygons (33%, 66%, 100%)', () => {
    const { container } = render(<RadarChart scores={mixed} />);
    const gridPolygons = container.querySelectorAll('[data-testid="radar-grid"]');
    expect(gridPolygons).toHaveLength(3);
  });

  it('renders 1 value polygon', () => {
    const { container } = render(<RadarChart scores={mixed} />);
    const valuePolygon = container.querySelectorAll('[data-testid="radar-values"]');
    expect(valuePolygon).toHaveLength(1);
  });

  it('renders 5 axis lines', () => {
    const { container } = render(<RadarChart scores={mixed} />);
    const axes = container.querySelectorAll('[data-testid="radar-axis"]');
    expect(axes).toHaveLength(5);
  });

  it('renders 5 dot circles at value vertices', () => {
    const { container } = render(<RadarChart scores={mixed} />);
    const dots = container.querySelectorAll('[data-testid="radar-dot"]');
    expect(dots).toHaveLength(5);
  });

  it('all scores = 0 → value polygon has all points near center', () => {
    const { container } = render(<RadarChart scores={allZero} animated={false} />);
    const polygon = container.querySelector('[data-testid="radar-values"]');
    const pts = polygon?.getAttribute('points') ?? '';
    // All points should be near center (cx=cy=120 for default size 240)
    pts.split(' ').forEach((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (x !== undefined && y !== undefined) {
        expect(Math.abs(x - 120)).toBeLessThan(1);
        expect(Math.abs(y - 120)).toBeLessThan(1);
      }
    });
  });

  it('all scores = 100 → regular pentagon at full radius', () => {
    const { container } = render(<RadarChart scores={allMax} animated={false} />);
    const polygon = container.querySelector('[data-testid="radar-values"]');
    const pts = polygon?.getAttribute('points') ?? '';
    const pairs = pts.trim().split(' ').filter(Boolean);
    expect(pairs).toHaveLength(5);
    // All points should be at the same distance from center
    const dists = pairs.map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return Math.sqrt((x! - 120) ** 2 + (y! - 120) ** 2);
    });
    const first = dists[0]!;
    dists.forEach((d) => expect(Math.abs(d - first)).toBeLessThan(0.1));
  });

  it('animated=false → no <animate> elements in SVG', () => {
    const { container } = render(<RadarChart scores={mixed} animated={false} />);
    const animateEls = container.querySelectorAll('animate');
    expect(animateEls).toHaveLength(0);
  });

  it('animated=true (default) → <animate> element present', () => {
    const { container } = render(<RadarChart scores={mixed} animated />);
    const animateEls = container.querySelectorAll('animate');
    expect(animateEls.length).toBeGreaterThan(0);
  });

  it('respects the size prop via viewBox', () => {
    const { container } = render(<RadarChart scores={mixed} size={300} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 300 300');
  });
});
