import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';

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
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Synchroniser — {connectionName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sprint */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Sprint <span className="text-gray-400 font-normal">(optionnel)</span>
            </Label>
            {loadingSprints ? (
              <div className="text-xs text-gray-400">Chargement des sprints...</div>
            ) : sprints.length > 0 ? (
              <Select
                value={sprint === '' ? '__all__' : sprint}
                onValueChange={(v) => setSprint(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tout le projet</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}{s.state === 'active' ? ' (actif)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={sprint}
                  onChange={(e) => setSprint(e.target.value)}
                  placeholder="Nom du sprint (ex: Sprint 14)"
                  className="flex-1 text-sm"
                />
                <span className="text-xs text-gray-400">Pas de sprints détectés</span>
              </div>
            )}
          </div>

          {/* Statuts */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Statuts <span className="text-gray-400 font-normal">(optionnel — tous si vide)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_STATUSES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus(s)}
                  className={`text-xs rounded-full px-2.5 py-1 h-auto transition-colors ${
                    selectedStatuses.includes(s)
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-400'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-200'
                  }`}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">
              Labels <span className="text-gray-400 font-normal">(séparés par virgule)</span>
            </Label>
            <Input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="ready-for-qa, sprint-14"
              className="w-full text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSync}
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? '↻ Sync...' : 'Synchroniser'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
