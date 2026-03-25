import { useState } from 'react';
import { api } from '../lib/api.js';

interface Props {
  generationId: string;
}

export function ADOTestCaseButton({ generationId }: Props) {
  const [creating, setCreating] = useState(false);
  const [testCaseId, setTestCaseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const data = await api.post<{ testCaseId: number }>(`/generations/${generationId}/ado-test-case`, {});
      setTestCaseId(data.testCaseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du Test Case ADO');
    } finally {
      setCreating(false);
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
        onClick={() => void handleCreate()}
        disabled={creating}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        📋 {creating ? 'Création...' : 'Créer Test Case ADO'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
