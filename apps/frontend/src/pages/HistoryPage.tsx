import { useConnectionFilter } from '../hooks/useConnectionFilter.js';
import { useHistoryData } from '../hooks/useHistoryData.js';
import { HistoryTree } from '../components/history/HistoryTree.js';

export function HistoryPage() {
  const { connections, connectionId, setConnectionId } = useConnectionFilter();
  const { groups, totalGenerations, loading } = useHistoryData(connectionId);

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
    <div className="p-6 max-w-4xl">
      {/* Header + filtre connexion */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalGenerations} génération{totalGenerations !== 1 ? 's' : ''}
          </p>
        </div>
        {connections.length > 0 && (
          <select
            value={connectionId ?? ''}
            onChange={(e) => setConnectionId(e.target.value || null)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les projets</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'jira' ? '🔵' : '🟣'} {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : totalGenerations === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🕐</p>
          <p className="text-sm font-medium text-gray-700 mb-1">Aucune génération pour le moment</p>
          <p className="text-sm text-gray-400 mb-4">
            Ouvrez une user story, analysez-la et cliquez sur "Générer les tests".
          </p>
          <a
            href="/stories"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Voir les User Stories →
          </a>
        </div>
      ) : (
        <HistoryTree groups={groups} onDownload={(id) => void handleDownload(id)} />
      )}
    </div>
  );
}
