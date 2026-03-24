import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Generation {
  id: string;
  analysisId: string;
  teamId: string;
  framework: string;
  language: string;
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  status: string;
  durationMs: number | null;
  createdAt: string;
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Generation[]>('/api/generations')
      .then(setGenerations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id: string) => {
    const { supabase } = await import('../lib/supabase.js');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const apiUrl = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

    const res = await fetch(`${apiUrl}/api/generations/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { alert('Erreur lors du téléchargement'); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testforge-${id.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Historique</h1>
        <p className="text-sm text-gray-500 mt-1">{generations.length} génération{generations.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : generations.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🕐</p>
          <p className="text-sm font-medium text-gray-700 mb-1">Aucune génération pour le moment</p>
          <p className="text-sm text-gray-400 mb-4">Ouvrez une user story, analysez-la et cliquez sur "Générer les tests".</p>
          <a href="/stories" className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            Voir les User Stories →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {generations.map((gen) => (
            <div key={gen.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${gen.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {gen.status === 'success' ? '✓ Succès' : '✗ Erreur'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{gen.id.slice(0, 8)}</span>
                    {gen.usedImprovedVersion && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">✨ version améliorée</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{gen.llmProvider} · {gen.llmModel}</span>
                    <span>Playwright · TypeScript</span>
                    {gen.durationMs && <span>{Math.round(gen.durationMs / 1000)}s</span>}
                  </div>
                  <p className="text-xs text-gray-300 mt-1">
                    {new Date(gen.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void navigate(`/stories`)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                  >
                    Voir US
                  </button>
                  {gen.status === 'success' && (
                    <button
                      onClick={() => void handleDownload(gen.id)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      ⬇ ZIP
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
