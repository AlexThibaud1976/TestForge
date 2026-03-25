import { useState } from 'react';
import { api } from '../lib/api.js';
import type { ManualTestSet } from '@testforge/shared-types';

interface Props {
  setId: string;
  status: string;
  onValidated: (updated: ManualTestSet) => void;
}

export function ManualTestValidateButton({ setId, status, onValidated }: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'validated' || status === 'pushed') {
    return (
      <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
        ✅ {status === 'pushed' ? 'Pushé' : 'Validé'}
      </div>
    );
  }

  const doValidate = async () => {
    setLoading(true);
    setError(null);
    setShowConfirm(false);
    try {
      const updated = await api.post<ManualTestSet>(`/api/manual-test-sets/${setId}/validate`, {});
      onValidated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          ✓ Valider le lot
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-green-800">Valider ce lot de tests manuels ? Il sera prêt à être pushé.</p>
          <div className="flex gap-2">
            <button onClick={() => void doValidate()} disabled={loading}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Validation...' : 'Confirmer'}
            </button>
            <button onClick={() => setShowConfirm(false)} className="text-sm text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
