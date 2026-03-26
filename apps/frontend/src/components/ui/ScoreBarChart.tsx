import { getScoreLevel } from './theme';
import type { RadarScores } from './RadarChart';

const DIMENSION_LABELS: Record<keyof RadarScores, string> = {
  clarity: 'Clarté',
  completeness: 'Complétude',
  testability: 'Testabilité',
  edgeCases: 'Cas limites',
  acceptanceCriteria: 'Critères AC',
};

const BAR_COLORS = {
  high:   'bg-green-500',
  medium: 'bg-amber-400',
  low:    'bg-red-500',
} as const;

/** Props du ScoreBarChart. */
export interface ScoreBarChartProps {
  /** Scores par dimension (0-100). */
  scores: RadarScores;
  /** Classes CSS supplémentaires. */
  className?: string;
}

/**
 * Barres de progression horizontales pour les 5 dimensions d'analyse.
 * Utilise getScoreLevel() de theme.ts pour les couleurs sémantiques.
 */
export function ScoreBarChart({ scores, className = '' }: ScoreBarChartProps) {
  const dimensions = (Object.keys(DIMENSION_LABELS) as Array<keyof RadarScores>);

  return (
    <div className={`space-y-2 ${className}`}>
      {dimensions.map((axis) => {
        const score = scores[axis];
        const level = getScoreLevel(score);
        const barColor = BAR_COLORS[level];

        return (
          <div key={axis} data-testid="bar-row" className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24 shrink-0 text-right">
              {DIMENSION_LABELS[axis]}
            </span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                data-testid="bar-fill"
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700 w-6 text-right shrink-0">
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
