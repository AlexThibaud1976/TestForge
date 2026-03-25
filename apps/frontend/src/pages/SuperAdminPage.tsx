import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface TeamRow {
  id: string;
  name: string;
  plan: string;
  suspendedAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

interface Stats {
  totalTeams: number;
  activeTeams: number;
  trialTeams: number;
  suspendedTeams: number;
  totalGenerationsThisMonth: number;
  totalAnalysesThisMonth: number;
}

export function SuperAdminPage() {
  const { session } = useAuth();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/teams', { headers }).then((r) => r.json()),
      fetch('/api/admin/stats', { headers }).then((r) => r.json()),
    ])
      .then(([teamsRes, statsRes]) => {
        if (teamsRes.error) { setError(teamsRes.error); return; }
        setTeams(teamsRes.data ?? []);
        setStats(statsRes);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleSuspend = async (id: string, suspended: boolean) => {
    const action = suspended ? 'reactivate' : 'suspend';
    if (!confirm(`${suspended ? 'Réactiver' : 'Suspendre'} ce compte ?`)) return;
    await fetch(`/api/admin/teams/${id}/${action}`, { method: 'POST', headers });
    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, suspendedAt: suspended ? null : new Date().toISOString() } : t)),
    );
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          ❌ Accès refusé : {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Super Admin</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Équipes totales', value: stats.totalTeams },
            { label: 'Actives', value: stats.activeTeams },
            { label: 'Trial', value: stats.trialTeams },
            { label: 'Suspendues', value: stats.suspendedTeams },
            { label: 'Générations ce mois', value: stats.totalGenerationsThisMonth },
            { label: 'Analyses ce mois', value: stats.totalAnalysesThisMonth },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Chargement...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Équipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Créée le</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teams.map((team) => {
                const isSuspended = !!team.suspendedAt;
                return (
                  <tr key={team.id} className={isSuspended ? 'bg-red-50' : undefined}>
                    <td className="px-4 py-3 font-medium text-gray-900">{team.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {team.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isSuspended ? (
                        <span className="text-red-600 text-xs font-medium">Suspendu</span>
                      ) : (
                        <span className="text-green-600 text-xs font-medium">Actif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(team.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSuspend(team.id, isSuspended)}
                        className={`text-xs border rounded px-2 py-1 ${
                          isSuspended
                            ? 'text-green-600 border-green-200 hover:bg-green-50'
                            : 'text-red-600 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        {isSuspended ? 'Réactiver' : 'Suspendre'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
