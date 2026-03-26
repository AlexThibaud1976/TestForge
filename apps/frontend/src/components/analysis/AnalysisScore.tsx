import { ScoreBadge } from '../ui/ScoreBadge.js';
import { RadarChart } from '../ui/RadarChart.js';
import { ScoreBarChart } from '../ui/ScoreBarChart.js';
import { getScoreLevel, SCORE_COLORS } from '../ui/theme.js';

interface AnalysisScoreProps {
  scoreGlobal: number;
  scoreClarity: number;
  scoreCompleteness: number;
  scoreTestability: number;
  scoreEdgeCases: number;
  scoreAcceptanceCriteria: number;
}

export function AnalysisScore({
  scoreGlobal,
  scoreClarity,
  scoreCompleteness,
  scoreTestability,
  scoreEdgeCases,
  scoreAcceptanceCriteria,
}: AnalysisScoreProps) {
  const level = getScoreLevel(scoreGlobal);
  const colors = SCORE_COLORS[level];

  const scores = {
    clarity: scoreClarity,
    completeness: scoreCompleteness,
    testability: scoreTestability,
    edgeCases: scoreEdgeCases,
    acceptanceCriteria: scoreAcceptanceCriteria,
  };

  return (
    <div>
      {/* Score global */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl font-bold" style={{ color: colors.text }}>{scoreGlobal}</span>
        <span className="text-gray-400 text-sm">/100</span>
        <ScoreBadge score={scoreGlobal} />
      </div>

      {/* Alerte si score < 40 */}
      {scoreGlobal < 40 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          Score trop faible — cette US est trop vague pour générer des tests pertinents. Consultez les suggestions ci-dessous.
        </div>
      )}

      {/* Radar + barres côte à côte */}
      <div className="flex gap-6 items-start mt-4">
        <RadarChart scores={scores} size={220} />
        <ScoreBarChart scores={scores} className="flex-1 pt-2" />
      </div>
    </div>
  );
}
