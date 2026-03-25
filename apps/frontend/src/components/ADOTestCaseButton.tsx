import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  generationId: string;
}

export function ADOTestCaseButton({ generationId }: Props) {
  const { session } = useAuth();
  const [creating, setCreating] = useState(false);
  const [testCaseId, setTestCaseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/generations/${generationId}/ado-test-case`, {
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
      setTestCaseId(data.testCaseId);
    } else {
      const data = await res.json();
      setError(data.error ?? 'Erreur lors de la création du Test Case ADO');
    }
  };

  if (testCaseId) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        ✅ Test Case ADO créé : <span className="font-mono font-medium">#{testCaseId}</span>
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
        📋 {creating ? 'Création...' : 'Créer Test Case ADO'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
