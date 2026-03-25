import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface GitConfig {
  id: string;
  name: string;
  provider: string;
  defaultBranch: string;
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
  const { session } = useAuth();
  const [configs, setConfigs] = useState<GitConfig[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState('');
  const [mode, setMode] = useState<'commit' | 'pr'>('pr');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };

  useEffect(() => {
    if (showDialog && configs.length === 0) {
      fetch('/api/git-configs', { headers })
        .then((r) => r.json())
        .then((data: GitConfig[]) => {
          setConfigs(data);
          if (data.length > 0) setSelectedConfig(data[0]!.id);
        });
    }
  }, [showDialog]);

  const handlePush = async () => {
    if (!selectedConfig) return;
    setPushing(true);
    const res = await fetch(`/api/generations/${generationId}/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ gitConfigId: selectedConfig, mode }),
    });
    const data = await res.json();
    setPushing(false);
    if (res.ok) {
      setResult(data);
    } else {
      setResult({ branchName: '', status: 'error', commitSha: data.error });
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
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
      >
        ↑ Pousser vers Git
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pousser vers Git</h3>

            {configs.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun repo configuré.{' '}
                <a href="/settings/git" className="text-indigo-600 underline">
                  Configurer un repo →
                </a>
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repo cible</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
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
                {result?.status === 'error' && (
                  <p className="text-sm text-red-600">❌ {result.commitSha}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handlePush}
                    disabled={pushing}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {pushing ? 'Push en cours...' : 'Pousser'}
                  </button>
                  <button
                    onClick={() => setShowDialog(false)}
                    className="text-gray-600 px-4 py-2 text-sm hover:text-gray-900"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
