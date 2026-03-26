export const SCORE_COLORS = {
  high:   { bg: '#E6F9E6', text: '#1a7a1a', accent: '#22c55e', border: '#22c55e' },
  medium: { bg: '#FFF3E0', text: '#b86800', accent: '#f59e0b', border: '#f59e0b' },
  low:    { bg: '#FFE8E8', text: '#c43030', accent: '#ef4444', border: '#ef4444' },
} as const;

export const BRAND = {
  primary:   '#3b82f6',
  secondary: '#6366f1',
  accent:    '#22d3ee',
} as const;

export type ScoreLevel = keyof typeof SCORE_COLORS;

export function getScoreLevel(score: number): ScoreLevel {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
