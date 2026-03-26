import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Label } from '@/components/ui/label.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.js';

interface GitConfig {
  id: string;
  name: string;
  provider: string;
}

interface PushResult {
  branchName: string;
  commitSha?: string;
  prUrl?: string;
  status: string;
}

interface Props {
  generationId: string;
}

export function GitPushButton({ generationId }: Props) {
  const [configs, setConfigs] = useState<GitConfig[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [mode, setMode] = useState<'commit' | 'pr'>('pr');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showDialog && configs.length === 0) {
      api.get<GitConfig[]>('/api/git-configs')
        .then((data) => {
          setConfigs(data);
          if (data.length > 0) setSelectedConfig(data[0]!.id);
        })
        .catch(() => setConfigs([]));
    }
  }, [showDialog]);

  const handlePush = async () => {
    if (!selectedConfig) return;
    setPushing(true);
    setError(null);
    try {
      const data = await api.post<PushResult>(`/api/generations/${generationId}/push`, {
        gitConfigId: selectedConfig,
        mode,
      });
      setResult(data);
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du push');
    } finally {
      setPushing(false);
    }
  };

  if (result?.status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <span>✅ Poussé sur</span>
        {result.prUrl ? (
          <a href={result.prUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
            PR créée
          </a>
        ) : (
          <span className="font-medium">{result.branchName}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        ↑ Pousser vers Git
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pousser vers Git</DialogTitle>
          </DialogHeader>

          {configs.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun repo configuré.{' '}
              <a href="/settings/git" className="text-indigo-600 underline">Configurer un repo →</a>
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Repo cible</Label>
                <select
                  value={selectedConfig}
                  onChange={(e) => setSelectedConfig(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Mode</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" value="pr" checked={mode === 'pr'} onChange={() => setMode('pr')} />
                    Pull Request
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" value="commit" checked={mode === 'commit'} onChange={() => setMode('commit')} />
                    Commit direct
                  </label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">❌ {error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => void handlePush()}
              disabled={pushing || configs.length === 0}
              variant="indigo"
            >
              {pushing ? 'Push en cours...' : 'Pousser'}
            </Button>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
