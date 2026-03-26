import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

interface StoryMeta {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
}

export interface DuplicatePair {
  id: string;
  similarity: number;
  status: string;
  storyA: StoryMeta;
  storyB: StoryMeta;
}

interface Props {
  pairs: DuplicatePair[];
  onIgnored: (pairId: string) => void;
  onClose: () => void;
}

export function DuplicatesPanel({ pairs, onIgnored, onClose }: Props) {
  const navigate = useNavigate();
  const [comparing, setComparing] = useState<DuplicatePair | null>(null);
  const [ignoring, setIgnoring] = useState<string | null>(null);

  const handleIgnore = async (pairId: string) => {
    setIgnoring(pairId);
    await api.post(`/api/duplicates/${pairId}/ignore`, {}).catch(() => null);
    onIgnored(pairId);
    setIgnoring(null);
  };

  if (comparing) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Comparaison de doublons potentiels</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-orange-600 font-medium">
                Similarité : {Math.round(comparing.similarity * 100)}%
              </span>
              <button onClick={() => setComparing(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
            {[comparing.storyA, comparing.storyB].map((story, i) => (
              <div key={i} className="p-5 space-y-3">
                <div>
                  <span className="text-xs font-mono text-gray-400">{story.externalId}</span>
                  <h4 className="text-sm font-semibold text-gray-900 mt-0.5">{story.title}</h4>
                </div>
                {story.description && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{story.description}</p>
                  </div>
                )}
                {story.acceptanceCriteria && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Critères d'acceptance</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap">{story.acceptanceCriteria}</p>
                  </div>
                )}
                <button
                  onClick={() => { void navigate(`/stories/${story.id}`); onClose(); }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Voir la US →
                </button>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 flex gap-3">
            <button
              onClick={() => void handleIgnore(comparing.id)}
              disabled={ignoring === comparing.id}
              className="text-sm border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Ignorer (faux positif)
            </button>
            <button onClick={() => setComparing(null)} className="text-sm text-gray-400 hover:text-gray-600">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Doublons potentiels ({pairs.length})
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="divide-y divide-gray-100">
          {pairs.map((pair) => (
            <div key={pair.id} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full font-medium">
                    {Math.round(pair.similarity * 100)}% similaires
                  </span>
                </div>
                <p className="text-sm text-gray-800 truncate">
                  <span className="font-mono text-gray-400 mr-1">{pair.storyA.externalId}</span>
                  {pair.storyA.title}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  <span className="font-mono text-gray-400 mr-1">{pair.storyB.externalId}</span>
                  {pair.storyB.title}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setComparing(pair)}
                  className="text-xs border border-indigo-200 text-indigo-600 px-2.5 py-1 rounded hover:bg-indigo-50"
                >
                  Comparer
                </button>
                <button
                  onClick={() => void handleIgnore(pair.id)}
                  disabled={ignoring === pair.id}
                  className="text-xs border border-gray-200 text-gray-500 px-2.5 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Ignorer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
