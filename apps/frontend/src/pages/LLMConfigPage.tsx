import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

type Provider = 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama';

interface LLMConfig {
  id: string;
  provider: Provider;
  model: string;
  azureEndpoint: string | null;
  azureDeployment: string | null;
  ollamaEndpoint: string | null;
  isDefault: boolean;
  createdAt: string;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  azure_openai: 'Azure OpenAI',
  mistral: 'Mistral AI',
  ollama: 'Ollama (local)',
};

const PROVIDER_MODELS: Record<Provider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o',       label: 'GPT-4o' },
    { id: 'gpt-4o-mini',  label: 'GPT-4o mini' },
    { id: 'o3-mini',      label: 'o3 mini' },
    { id: 'o1',           label: 'o1' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-6',          label: 'Claude Sonnet 4.6 (recommandé)' },
    { id: 'claude-opus-4-6',            label: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5-20251001',  label: 'Claude Haiku 4.5' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku' },
  ],
  azure_openai: [],
  mistral: [
    { id: 'mistral-large-latest', label: 'Mistral Large (recommandé)' },
    { id: 'mistral-small-latest', label: 'Mistral Small' },
  ],
  ollama: [], // modèle libre (nom local)
};

export function LLMConfigPage() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    api.get<LLMConfig[]>('/api/llm-configs')
      .then(setConfigs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await api.post(`/api/llm-configs/${id}/test`, {});
      setTestResult((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [id]: e instanceof Error ? e.message : 'Erreur' }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    await api.put(`/api/llm-configs/${id}/set-default`, {});
    setConfigs((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette configuration LLM ?')) return;
    await api.delete(`/api/llm-configs/${id}`);
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdated = (updated: LLMConfig) => {
    setConfigs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setTestResult((prev) => { const next = { ...prev }; delete next[updated.id]; return next; });
    setEditingId(null);
  };

  const handleCreated = (config: LLMConfig) => {
    setConfigs((prev) => [...prev, config]);
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuration LLM</h1>
          <p className="text-sm text-gray-500 mt-1">Provider utilisé pour l'analyse et la génération</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {showForm && <LLMForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🤖</p>
          <p className="text-sm">Aucun provider configuré. Ajoutez une clé API pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <div key={config.id} className={`bg-white border rounded-lg p-4 ${config.isDefault ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{PROVIDER_LABELS[config.provider]}</span>
                    <span className="text-xs font-mono text-gray-400">{config.model}</span>
                    {config.isDefault && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Défaut</span>
                    )}
                  </div>
                  {config.azureEndpoint && (
                    <p className="text-xs text-gray-400 mt-1">{config.azureEndpoint}</p>
                  )}
                  {config.ollamaEndpoint && (
                    <p className="text-xs text-gray-400 mt-1">{config.ollamaEndpoint}</p>
                  )}
                  {testResult[config.id] !== undefined && (
                    <p className={`text-xs mt-1 ${testResult[config.id] === true ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult[config.id] === true ? '✓ Connexion OK' : `✗ ${String(testResult[config.id])}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleTest(config.id)}
                    disabled={testingId === config.id}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {testingId === config.id ? '...' : 'Tester'}
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === config.id ? null : config.id)}
                    className="text-xs px-2 py-1 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
                  >
                    Modifier
                  </button>
                  {!config.isDefault && (
                    <button
                      onClick={() => void handleSetDefault(config.id)}
                      className="text-xs px-2 py-1 border border-blue-200 rounded text-blue-600 hover:bg-blue-50"
                    >
                      Défaut
                    </button>
                  )}
                  <button
                    onClick={() => void handleDelete(config.id)}
                    className="text-xs px-2 py-1 border border-red-200 rounded text-red-500 hover:bg-red-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {editingId === config.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <LLMEditForm
                    config={config}
                    onUpdated={handleUpdated}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LLMForm({ onCreated, onCancel }: { onCreated: (c: LLMConfig) => void; onCancel: () => void }) {
  const [provider, setProvider] = useState<Provider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(PROVIDER_MODELS['openai']?.[0]?.id ?? 'gpt-4o');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [azureDeployment, setAzureDeployment] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDER_MODELS[p]?.[0]?.id ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let body: Record<string, string>;
      if (provider === 'azure_openai') {
        body = { provider, model, apiKey, azureEndpoint, azureDeployment };
      } else if (provider === 'ollama') {
        body = { provider, model, ollamaEndpoint };
      } else {
        body = { provider, model, apiKey };
      }
      const config = await api.post<LLMConfig>('/api/llm-configs', body);
      onCreated(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const hasApiKey = provider !== 'ollama';
  const hasModelInput = provider === 'azure_openai' || provider === 'ollama';
  const models = PROVIDER_MODELS[provider] ?? [];

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Nouveau provider LLM</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(['openai', 'anthropic', 'azure_openai', 'mistral', 'ollama'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handleProviderChange(p)}
            className={`px-2 py-2 text-xs font-medium rounded-md border transition-colors ${provider === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
          >
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
          {hasModelInput ? (
            <input type="text" required value={model} onChange={(e) => setModel(e.target.value)}
              placeholder={provider === 'ollama' ? 'llama3:8b, mistral, ...' : 'Deployment name'}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ) : (
            <select required value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}
        </div>
        {hasApiKey ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
            <input type="password" required value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'mistral' ? 'Clé API Mistral...' : 'sk-...'}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Ollama</label>
            <input type="url" required value={ollamaEndpoint} onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
        {provider === 'azure_openai' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Azure Endpoint</label>
              <input type="url" required value={azureEndpoint} onChange={(e) => setAzureEndpoint(e.target.value)}
                placeholder="https://myresource.openai.azure.com"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deployment Name</label>
              <input type="text" required value={azureDeployment} onChange={(e) => setAzureDeployment(e.target.value)}
                placeholder="my-gpt4o-deployment"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Création...' : 'Créer'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

function LLMEditForm({ config, onUpdated, onCancel }: {
  config: LLMConfig;
  onUpdated: (c: LLMConfig) => void;
  onCancel: () => void;
}) {
  const [model, setModel] = useState(config.model);
  const [apiKey, setApiKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState(config.azureEndpoint ?? '');
  const [azureDeployment, setAzureDeployment] = useState(config.azureDeployment ?? '');
  const [ollamaEndpoint, setOllamaEndpoint] = useState(config.ollamaEndpoint ?? 'http://localhost:11434');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { model };
      if (apiKey) body['apiKey'] = apiKey;
      if (config.provider === 'azure_openai') {
        if (azureEndpoint) body['azureEndpoint'] = azureEndpoint;
        if (azureDeployment) body['azureDeployment'] = azureDeployment;
      }
      if (config.provider === 'ollama' && ollamaEndpoint) {
        body['ollamaEndpoint'] = ollamaEndpoint;
      }
      const updated = await api.patch<LLMConfig>(`/api/llm-configs/${config.id}`, body);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
          {config.provider === 'azure_openai' ? (
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ) : (
            <select value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {(PROVIDER_MODELS[config.provider] ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nouvelle API Key <span className="text-gray-400 font-normal">(laisser vide pour conserver l&apos;actuelle)</span>
          </label>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {config.provider === 'azure_openai' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Azure Endpoint</label>
              <input type="url" value={azureEndpoint} onChange={(e) => setAzureEndpoint(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deployment Name</label>
              <input type="text" value={azureDeployment} onChange={(e) => setAzureDeployment(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
        {config.provider === 'ollama' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL Ollama</label>
            <input type="url" value={ollamaEndpoint} onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
          Annuler
        </button>
      </div>
    </form>
  );
}
