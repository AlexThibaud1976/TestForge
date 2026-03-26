import { getScoreLevel, SCORE_COLORS } from './theme';

/** Props du badge de score coloré sémantique. */
export interface ScoreBadgeProps {
  /** Valeur du score (0-100). */
  score: number;
  /** Affiche le dot indicateur. Défaut : true. */
  showDot?: boolean;
  /** Taille du badge. Défaut : 'md'. */
  size?: 'sm' | 'md';
  /** Classes CSS supplémentaires. */
  className?: string;
}

const TAILWIND_COLORS = {
  high:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  medium: { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  low:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
} as const;

/**
 * Badge compact affichant un score avec une couleur sémantique.
 * Vert > 70, Amber 40-70, Rouge < 40.
 */
export function ScoreBadge({ score, showDot = true, size = 'md', className = '' }: ScoreBadgeProps) {
  const level = getScoreLevel(score);
  const colors = TAILWIND_COLORS[level];
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${padding} ${colors.bg} ${colors.text} ${className}`}
    >
      {showDot && (
        <span
          data-testid="score-dot"
          className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
        />
      )}
      {score}
    </span>
  );
}

// Keep SCORE_COLORS accessible for consumers who need hex values
export { SCORE_COLORS, getScoreLevel };
