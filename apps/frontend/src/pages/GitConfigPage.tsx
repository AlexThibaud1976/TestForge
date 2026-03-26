import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { ProviderLogo } from '../components/ui/ProviderLogo.js';

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
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api.get<GitConfig[]>('/api/git-configs')
      .then(setConfigs)
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      const created = await api.post<GitConfig>('/api/git-configs', form);
      setConfigs((prev) => [...prev, created]);
      setShowForm(false);
      setForm({ provider: 'github', name: '', repoUrl: '', token: '', defaultBranch: 'main' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const data = await api.post<{ ok: boolean; repoName: string; defaultBranch: string }>(
        `/api/git-configs/${id}/test`, {},
      );
      setTestResult(`✅ ${data.repoName} (branche: ${data.defaultBranch})`);
    } catch (err) {
      setTestResult(`❌ ${err instanceof Error ? err.message : 'Erreur de connexion'}`);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette configuration Git ?')) return;
    try {
      await api.delete(`/api/git-configs/${id}`);
      setConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurations Git</h1>
        <button
          onClick={() => { setShowForm(true); setSaveError(null); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Nouveau repo
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleCreate(e)} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
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
          {saveError && <p className="text-sm text-red-600">❌ {saveError}</p>}
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
                <div className="flex items-center gap-2 mb-0.5">
                  <ProviderLogo provider={config.provider} size={16} showLabel />
                  <span className="font-medium text-gray-900 text-sm">{config.name}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {config.repoUrl} · branche: {config.defaultBranch}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleTest(config.id)}
                  disabled={testing === config.id}
                  className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2 py-1"
                >
                  {testing === config.id ? 'Test...' : 'Tester'}
                </button>
                <button
                  onClick={() => void handleDelete(config.id)}
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
