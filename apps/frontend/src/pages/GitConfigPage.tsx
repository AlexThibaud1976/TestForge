import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface GitConfig {
  id: string;
  provider: 'github' | 'gitlab' | 'azure_repos';
  name: string;
  repoUrl: string;
  defaultBranch: string;
  createdAt: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  azure_repos: 'Azure Repos',
};

export function GitConfigPage() {
  const { session } = useAuth();
  const [configs, setConfigs] = useState<GitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    provider: 'github' as GitConfig['provider'],
    name: '',
    repoUrl: '',
    token: '',
    defaultBranch: 'main',
  });
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  };

  useEffect(() => {
    fetch('/api/git-configs', { headers })
      .then((r) => r.json())
      .then(setConfigs)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/git-configs', {
      method: 'POST',
      headers,
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setConfigs((prev) => [...prev, created]);
      setShowForm(false);
      setForm({ provider: 'github', name: '', repoUrl: '', token: '', defaultBranch: 'main' });
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    const res = await fetch(`/api/git-configs/${id}/test`, { method: 'POST', headers });
    const data = await res.json();
    setTestResult(res.ok ? `✅ ${data.repoName} (branche: ${data.defaultBranch})` : `❌ ${data.error}`);
    setTesting(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette configuration Git ?')) return;
    await fetch(`/api/git-configs/${id}`, { method: 'DELETE', headers });
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurations Git</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nouveau repo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Ajouter un repo Git</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select
                value={form.provider}
                onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as GitConfig['provider'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="github">GitHub</option>
                <option value="gitlab">GitLab</option>
                <option value="azure_repos">Azure Repos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Repo Tests E2E"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL du repo</label>
            <input
              type="url"
              value={form.repoUrl}
              onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))}
              placeholder="https://github.com/org/repo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token PAT</label>
              <input
                type="password"
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                placeholder="ghp_xxxx"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branche par défaut</label>
              <input
                type="text"
                value={form.defaultBranch}
                onChange={(e) => setForm((f) => ({ ...f, defaultBranch: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-4 py-2 text-sm hover:text-gray-900">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Chargement...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun repo Git configuré.</p>
          <p className="text-xs mt-1">Ajoutez un repo pour pouvoir pousser les tests générés.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <div key={config.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 text-sm">{config.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {PROVIDER_LABELS[config.provider]} · {config.repoUrl} · branche: {config.defaultBranch}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(config.id)}
                  disabled={testing === config.id}
                  className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2 py-1"
                >
                  {testing === config.id ? 'Test...' : 'Tester'}
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {testResult && (
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">{testResult}</div>
          )}
        </div>
      )}
    </div>
  );
}
