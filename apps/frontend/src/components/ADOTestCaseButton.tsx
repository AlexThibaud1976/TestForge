import { useState } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';

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
      const data = await api.post<{ testCaseId: number }>(`/api/generations/${generationId}/ado-test-case`, {});
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
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleCreate()}
        disabled={creating}
      >
        📋 {creating ? 'Création...' : 'Créer Test Case ADO'}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
