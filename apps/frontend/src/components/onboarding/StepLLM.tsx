import { useState } from 'react';
import { api } from '../../lib/api.js';

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  azure_openai: 'gpt-4o',
};

interface StepLLMProps {
  onComplete: () => void;
}

export function StepLLM({ onComplete }: StepLLMProps) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODELS['openai']!);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? 'gpt-4o');
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/llm-configs', { provider, apiKey, model, isDefault: true });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Configurez un provider LLM pour activer l'analyse de vos user stories.
      </p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className={inputClass}
          data-testid="llm-provider"
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="azure_openai">Azure OpenAI</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Clé API</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : ''}
          className={inputClass}
          data-testid="llm-api-key"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Modèle</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className={inputClass}
          data-testid="llm-model"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={() => void handleSave()}
        disabled={saving || !apiKey.trim()}
        className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder et continuer →'}
      </button>
    </div>
  );
}
