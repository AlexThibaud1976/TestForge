import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Skeleton } from '@/components/ui/skeleton.js';

interface UserStory {
  id: string;
  externalId: string;
  title: string;
}

interface StepFirstAnalysisProps {
  onComplete: () => void;
}

export function StepFirstAnalysis({ onComplete }: StepFirstAnalysisProps) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStories, setLoadingStories] = useState(true);

  useEffect(() => {
    api
      .get<{ data: UserStory[] }>('/api/user-stories?pageSize=5')
      .then((r) => setStories(r.data))
      .catch(() => {})
      .finally(() => setLoadingStories(false));
  }, []);

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.post<{ scoreGlobal: number }>('/api/analyses', {
        userStoryId: selectedId,
      });
      setScore(result.scoreGlobal);
      localStorage.setItem('testforge_first_analysis', 'true');
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  function scoreColor(s: number): string {
    if (s >= 70) return 'text-green-600 bg-green-50';
    if (s >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Choisissez une user story pour lancer votre première analyse qualité.
      </p>

      {loadingStories ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">Aucune user story disponible.</p>
          <p className="text-xs mt-1">Synchronisez d'abord votre connexion.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {stories.map((story) => (
            <label
              key={story.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                selectedId === story.id
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="story"
                value={story.id}
                checked={selectedId === story.id}
                onChange={() => setSelectedId(story.id)}
                className="text-blue-600"
              />
              <span className="text-xs font-mono text-gray-400">{story.externalId}</span>
              <span className="text-sm text-gray-800 truncate">{story.title}</span>
            </label>
          ))}
        </div>
      )}

      {score !== null && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${scoreColor(score)}`}>
          <span className="text-xl font-bold">{score}/100</span>
          <span className="text-sm">Score de qualité</span>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        onClick={() => void handleAnalyze()}
        disabled={!selectedId || analyzing || stories.length === 0}
        className="w-full"
      >
        {analyzing ? 'Analyse en cours...' : 'Analyser cette US →'}
      </Button>
    </div>
  );
}
