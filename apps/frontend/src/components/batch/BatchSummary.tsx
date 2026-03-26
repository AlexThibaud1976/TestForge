import { useNavigate } from 'react-router-dom';
import type { BatchItemResult } from '../../hooks/useBatchAnalysis.js';

interface Story {
  id: string;
  title: string;
  externalId: string;
}

interface BatchSummaryProps {
  results: Map<string, BatchItemResult>;
  stories: Story[];
  onClose: () => void;
}

export function BatchSummary({ results, stories, onClose }: BatchSummaryProps) {
  const navigate = useNavigate();

  const successEntries = Array.from(results.entries()).filter(([, r]) => r.status === 'success');
  const scores = successEntries.map(([, r]) => r.score);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const distribution = {
    green: scores.filter((s) => s >= 70).length,
    yellow: scores.filter((s) => s >= 40 && s < 70).length,
    red: scores.filter((s) => s < 40).length,
  };

  const worst3 = [...successEntries]
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 3)
    .map(([id, r]) => ({
      id,
      score: r.score,
      story: stories.find((s) => s.id === id),
    }));

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Résumé du batch</h3>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1 bg-gray-900 text-white rounded-md hover:bg-gray-700"
        >
          Fermer
        </button>
      </div>

      {/* Score moyen + distribution */}
      <div className="flex items-center gap-6 mb-3">
        <div className="text-center">
          <div
            data-testid="avg-score"
            className="text-2xl font-bold text-gray-900"
          >
            {avgScore}
          </div>
          <div className="text-xs text-gray-400">Score moyen</div>
        </div>
        <div className="flex gap-3 text-sm">
          <span data-testid="dist-green" className="text-green-600">🟢 {distribution.green}</span>
          <span data-testid="dist-yellow" className="text-yellow-600">🟡 {distribution.yellow}</span>
          <span data-testid="dist-red" className="text-red-600">🔴 {distribution.red}</span>
        </div>
      </div>

      {/* Top 3 pires scores */}
      {worst3.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">US à améliorer en priorité</p>
          <div className="space-y-0.5">
            {worst3.map(({ id, score, story }) => (
              <button
                key={id}
                onClick={() => void navigate(`/stories/${id}`)}
                className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-50 rounded-md flex items-center justify-between group"
              >
                <span className="truncate text-gray-700 group-hover:text-blue-600">
                  {story?.externalId ?? id.slice(0, 8)} — {story?.title ?? 'US'}
                </span>
                <span className="ml-2 shrink-0 font-semibold text-red-600">
                  {score}/100
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
