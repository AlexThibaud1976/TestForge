import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

interface Sprint {
  id: string;
  name: string;
  state?: string;
}

interface Props {
  connectionId: string;
  connectionName: string;
  onSync: (filters: SyncFilters) => void;
  onCancel: () => void;
  loading: boolean;
}

export interface SyncFilters {
  sprint?: string;
  statuses?: string[];
  labels?: string[];
}

const COMMON_STATUSES = ['To Do', 'In Progress', 'Done', 'Ready', 'Active', 'New', 'Resolved'];

export function SyncDialog({ connectionId, connectionName, onSync, onCancel, loading }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [sprint, setSprint] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [labelsInput, setLabelsInput] = useState('');

  useEffect(() => {
    api.get<Sprint[]>(`/api/connections/${connectionId}/sprints`)
      .then(setSprints)
      .catch(() => setSprints([]))
      .finally(() => setLoadingSprints(false));
  }, [connectionId]);

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const handleSync = () => {
    const filters: SyncFilters = {};
    if (sprint) filters.sprint = sprint;
    if (selectedStatuses.length > 0) filters.statuses = selectedStatuses;
    const labels = labelsInput.split(',').map((l) => l.trim()).filter(Boolean);
    if (labels.length > 0) filters.labels = labels;
    onSync(filters);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Synchroniser — {connectionName}</h3>

        {/* Sprint */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sprint <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          {loadingSprints ? (
            <div className="text-xs text-gray-400">Chargement des sprints...</div>
          ) : sprints.length > 0 ? (
            <select
              value={sprint}
              onChange={(e) => setSprint(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Tout le projet</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.name}>{s.name}{s.state === 'active' ? ' (actif)' : ''}</option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
                placeholder="Nom du sprint (ex: Sprint 14)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-xs text-gray-400">Pas de sprints détectés</span>
            </div>
          )}
        </div>

        {/* Statuts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statuts <span className="text-gray-400 font-normal">(optionnel — tous si vide)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedStatuses.includes(s)
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-400'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Labels <span className="text-gray-400 font-normal">(séparés par virgule)</span>
          </label>
          <input
            type="text"
            value={labelsInput}
            onChange={(e) => setLabelsInput(e.target.value)}
            placeholder="ready-for-qa, sprint-14"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSync}
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '↻ Sync...' : 'Synchroniser'}
          </button>
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
