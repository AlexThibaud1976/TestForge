import { useNavigate } from 'react-router-dom';
import type { GenerationHistoryItem } from '../../hooks/useHistoryData.js';

interface GenerationCardProps {
  generation: GenerationHistoryItem;
  onDownload: (id: string) => void;
}

export function GenerationCard({ generation: gen, onDownload }: GenerationCardProps) {
  const navigate = useNavigate();

  // FIX BUG #1: framework + language dynamiques (jamais de string en dur)
  const frameworkLabel = gen.framework.charAt(0).toUpperCase() + gen.framework.slice(1);
  const languageLabel = gen.language.charAt(0).toUpperCase() + gen.language.slice(1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 ml-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                gen.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {gen.status === 'success' ? '✓ Succès' : '✗ Erreur'}
            </span>
            <span className="text-xs text-gray-400 font-mono">{gen.id.slice(0, 8)}</span>
            {gen.usedImprovedVersion && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                ✨ version améliorée
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>{gen.llmProvider} · {gen.llmModel}</span>
            <span>{frameworkLabel} · {languageLabel}</span>
            {gen.durationMs !== null && <span>{Math.round(gen.durationMs / 1000)}s</span>}
          </div>
          <p className="text-xs text-gray-300 mt-1">
            {new Date(gen.createdAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* FIX BUG #2: navigue vers /stories/:userStoryId et non /stories */}
          <button
            onClick={() => gen.userStoryId && navigate(`/stories/${gen.userStoryId}`)}
            disabled={!gen.userStoryId}
            title={gen.userStoryId ? undefined : 'US non disponible'}
            className={`text-xs px-2 py-1 border rounded ${
              gen.userStoryId
                ? 'border-gray-200 text-gray-500 hover:bg-gray-50'
                : 'border-gray-100 text-gray-300 opacity-40 cursor-not-allowed'
            }`}
          >
            Voir US
          </button>
          {gen.status === 'success' && (
            <button
              onClick={() => onDownload(gen.id)}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ⬇ ZIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
