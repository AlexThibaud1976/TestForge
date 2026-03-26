import { useState } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';

interface Props {
  generationId: string;
}

export function XrayTestButton({ generationId }: Props) {
  const [creating, setCreating] = useState(false);
  const [testKey, setTestKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ xrayTestKey: string }>(`/api/generations/${generationId}/xray`, {});
      setTestKey(data.xrayTestKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du test Xray');
    } finally {
      setCreating(false);
    }
  };

  if (testKey) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        ✅ Test Xray créé : <span className="font-mono font-medium">{testKey}</span>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleCreate()}
        disabled={creating}
      >
        🔗 {creating ? 'Création...' : 'Créer test Xray'}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
