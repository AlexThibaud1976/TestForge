import { BRAND } from './theme';

const AXES = ['clarity', 'completeness', 'testability', 'edgeCases', 'acceptanceCriteria'] as const;
const LABELS = ['Clarté', 'Complétude', 'Testabilité', 'Cas limites', 'Critères AC'];

/** Scores par dimension d'analyse pour le radar chart. */
export interface RadarScores {
  clarity: number;
  completeness: number;
  testability: number;
  edgeCases: number;
  acceptanceCriteria: number;
}

/** Props du composant RadarChart. */
export interface RadarChartProps {
  /** Scores par dimension (0-100). */
  scores: RadarScores;
  /** Taille du SVG en pixels. Défaut : 240. */
  size?: number;
  /** Active l'animation d'entrée. Défaut : true. */
  animated?: boolean;
  /** Durée de l'animation en ms. Défaut : 800. */
  animationDuration?: number;
  /** Classes CSS supplémentaires. */
  className?: string;
}

function getPoint(index: number, value: number, radius: number, cx: number, cy: number) {
  const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
  return {
    x: cx + radius * (value / 100) * Math.cos(angle),
    y: cy + radius * (value / 100) * Math.sin(angle),
  };
}

function pointsString(values: number[], radius: number, cx: number, cy: number): string {
  return values
    .map((v, i) => {
      const { x, y } = getPoint(i, v, radius, cx, cy);
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    })
    .join(' ');
}

function getLabelPosition(index: number, radius: number, cx: number, cy: number) {
  const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2;
  const labelRadius = radius * 1.22;
  return {
    x: cx + labelRadius * Math.cos(angle),
    y: cy + labelRadius * Math.sin(angle),
  };
}

/**
 * Radar chart SVG pur en 5 dimensions.
 * Aucune dépendance externe — coordonnées calculées par trigonométrie.
 */
export function RadarChart({
  scores,
  size = 240,
  animated = true,
  animationDuration = 800,
  className = '',
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  const values = AXES.map((axis) => scores[axis]);
  const gridLevels = [33, 66, 100];

  const valuePoints = pointsString(values, radius, cx, cy);
  const zeroPoints = pointsString(values.map(() => 0), radius, cx, cy);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={className}
      aria-label="Radar chart des scores d'analyse"
    >
      {/* Grid reference polygons */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          data-testid="radar-grid"
          points={pointsString(AXES.map(() => level), radius, cx, cy)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const end = getPoint(i, 100, radius, cx, cy);
        return (
          <line
            key={i}
            data-testid="radar-axis"
            x1={cx}
            y1={cy}
            x2={end.x}
            y2={end.y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}

      {/* Value polygon */}
      <polygon
        data-testid="radar-values"
        points={valuePoints}
        fill={BRAND.primary}
        fillOpacity={0.15}
        stroke={BRAND.primary}
        strokeWidth={1.5}
        strokeLinejoin="round"
      >
        {animated && (
          <animate
            attributeName="points"
            from={zeroPoints}
            to={valuePoints}
            dur={`${animationDuration}ms`}
            calcMode="spline"
            keySplines="0.25 0.1 0.25 1"
            fill="freeze"
          />
        )}
      </polygon>

      {/* Value dots */}
      {values.map((v, i) => {
        const { x, y } = getPoint(i, v, radius, cx, cy);
        return (
          <circle
            key={i}
            data-testid="radar-dot"
            cx={x}
            cy={y}
            r={3}
            fill={BRAND.primary}
          />
        );
      })}

      {/* Axis labels */}
      {LABELS.map((label, i) => {
        const { x, y } = getLabelPosition(i, radius, cx, cy);
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size < 200 ? 9 : 11}
            fill="#6b7280"
            fontFamily="sans-serif"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
