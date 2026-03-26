import { useEffect } from 'react';
import { useBatchAnalysis } from '../../hooks/useBatchAnalysis.js';
import { BatchSummary } from './BatchSummary.js';

interface Story {
  id: string;
  title: string;
  externalId: string;
}

interface BatchAnalysisModalProps {
  stories: Story[];
  onClose: () => void;
}

export function BatchAnalysisModal({ stories, onClose }: BatchAnalysisModalProps) {
  const { state, startBatch } = useBatchAnalysis();

  // Démarrer le batch automatiquement au montage
  useEffect(() => {
    void startBatch(stories.map((s) => s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-900">
              Analyse du sprint
            </h2>
            {state.done && (
              <span className="text-xs text-green-600 font-medium">✓ Terminé</span>
            )}
          </div>
          {/* Barre de progression */}
          <div className="flex items-center gap-2">
            <div
              data-testid="progress-bar"
              className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {state.completed}/{state.total}
            </span>
          </div>
        </div>

        {/* Liste des stories avec statut */}
        <div className="flex-1 overflow-y-auto p-2">
          {stories.map((story) => {
            const result = state.results.get(story.id);
            return (
              <div
                key={story.id}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-50"
              >
                {result ? (
                  <span
                    className={`text-xs font-semibold shrink-0 w-12 ${
                      result.status === 'success' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {result.status === 'success' ? `✓ ${result.score}` : '✗ Err'}
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-indigo-500 animate-spin shrink-0" />
                )}
                <span className="text-xs font-mono text-gray-400 shrink-0">
                  {story.externalId}
                </span>
                <span className="text-sm text-gray-700 truncate">{story.title}</span>
              </div>
            );
          })}
        </div>

        {/* Résumé quand terminé */}
        {state.done && (
          <BatchSummary
            results={state.results}
            stories={stories}
            onClose={onClose}
          />
        )}

        {/* Bouton fermer quand en cours */}
        {!state.done && (
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              Fermer (continue en arrière-plan)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
