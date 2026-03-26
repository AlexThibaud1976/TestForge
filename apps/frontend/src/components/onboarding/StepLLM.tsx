import { useState } from 'react';
import { api } from '../../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select.js';

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Configurez un provider LLM pour activer l'analyse de vos user stories.
      </p>

      <div>
        <Label className="block text-xs font-medium text-gray-700 mb-1">Provider</Label>
        <Select
          value={provider}
          onValueChange={(v) => handleProviderChange(v)}
          data-testid="llm-provider"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="azure_openai">Azure OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="block text-xs font-medium text-gray-700 mb-1">Clé API</Label>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : ''}
          data-testid="llm-api-key"
        />
      </div>

      <div>
        <Label className="block text-xs font-medium text-gray-700 mb-1">Modèle</Label>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          data-testid="llm-model"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        onClick={() => void handleSave()}
        disabled={saving || !apiKey.trim()}
        className="w-full"
      >
        {saving ? 'Sauvegarde...' : 'Sauvegarder et continuer →'}
      </Button>
    </div>
  );
}
