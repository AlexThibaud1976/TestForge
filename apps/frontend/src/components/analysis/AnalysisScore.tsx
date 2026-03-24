interface Dimension {
  label: string;
  score: number;
}

interface AnalysisScoreProps {
  scoreGlobal: number;
  scoreClarity: number;
  scoreCompleteness: number;
  scoreTestability: number;
  scoreEdgeCases: number;
  scoreAcceptanceCriteria: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-500';
}

function scoreBadge(score: number): { label: string; className: string } {
  if (score >= 70) return { label: '🟢 Bon', className: 'bg-green-100 text-green-700' };
  if (score >= 40) return { label: '🟡 Moyen', className: 'bg-yellow-100 text-yellow-700' };
  return { label: '🔴 Faible', className: 'bg-red-100 text-red-700' };
}

export function AnalysisScore({
  scoreGlobal,
  scoreClarity,
  scoreCompleteness,
  scoreTestability,
  scoreEdgeCases,
  scoreAcceptanceCriteria,
}: AnalysisScoreProps) {
  const badge = scoreBadge(scoreGlobal);

  const dimensions: Dimension[] = [
    { label: 'Clarté', score: scoreClarity },
    { label: 'Complétude', score: scoreCompleteness },
    { label: 'Testabilité', score: scoreTestability },
    { label: 'Edge cases', score: scoreEdgeCases },
    { label: 'Critères accept.', score: scoreAcceptanceCriteria },
  ];

  return (
    <div>
      {/* Score global */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-4xl font-bold ${scoreColor(scoreGlobal)}`}>{scoreGlobal}</span>
        <div>
          <span className="text-gray-400 text-sm">/100</span>
          <div className={`mt-0.5 text-xs px-2 py-0.5 rounded-full inline-block ml-1 ${badge.className}`}>
            {badge.label}
          </div>
        </div>
      </div>

      {/* Alerte si score < 40 */}
      {scoreGlobal < 40 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          ⚠️ Cette US est trop vague pour générer des tests pertinents. Consultez les suggestions ci-dessous.
        </div>
      )}

      {/* Jauges par dimension */}
      <div className="space-y-2">
        {dimensions.map((dim) => (
          <div key={dim.label}>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>{dim.label}</span>
              <span className={scoreColor(dim.score)}>{dim.score}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${scoreBarColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
