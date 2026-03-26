import { useState } from 'react';
import { api } from '../lib/api.js';
import type { ManualTestSet } from '@testforge/shared-types';
import { Button } from './ui/button.js';

interface PushResult {
  pushed: number;
  testCases: Array<{ id: string; externalId: string; externalUrl: string | null }>;
}

interface Props {
  setId: string;
  status: string;
  onPushed: (updated: Partial<ManualTestSet>) => void;
}

export function ManualTestPushButton({ setId, status, onPushed }: Props) {
  const [target, setTarget] = useState<'xray' | 'ado'>('xray');
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === 'draft') {
    return <p className="text-xs text-gray-400">Validez le lot avant de pousser</p>;
  }

  if (result) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        ✅ {result.pushed} test(s) pushé(s) vers {target.toUpperCase()}
      </div>
    );
  }

  const handlePush = async () => {
    setPushing(true);
    setError(null);
    try {
      const data = await api.post<PushResult>(`/api/manual-test-sets/${setId}/push`, { target });
      setResult(data);
      onPushed({ status: 'pushed', pushTarget: target });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du push');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="radio" value="xray" checked={target === 'xray'} onChange={() => setTarget('xray')} />
          Xray Cloud
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input type="radio" value="ado" checked={target === 'ado'} onChange={() => setTarget('ado')} />
          ADO Test Plans
        </label>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handlePush()}
        disabled={pushing}
      >
        🔗 {pushing ? 'Push en cours...' : `Pousser vers ${target === 'xray' ? 'Xray' : 'ADO'}`}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
