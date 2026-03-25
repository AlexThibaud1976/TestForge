import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  generationId: string;
}

export function XrayTestButton({ generationId }: Props) {
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);
  const [testKey, setTestKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/generations/${generationId}/xray`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({}),
    });
    setCreating(false);
    if (res.ok) {
      const data = await res.json();
      setTestKey(data.xrayTestKey);
    } else {
      const data = await res.json();
      setError(data.error ?? 'Erreur lors de la création du test Xray');
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
      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        🔗 {creating ? 'Création...' : 'Créer test Xray'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
