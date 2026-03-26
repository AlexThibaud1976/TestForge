import { useState } from 'react';
import { api } from '../lib/api.js';
import type { ManualTestSet } from '@testforge/shared-types';
import { Button } from './ui/button.js';

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
        <Button
          variant="success"
          onClick={() => setShowConfirm(true)}
          disabled={loading}
        >
          ✓ Valider le lot
        </Button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-green-800">Valider ce lot de tests manuels ? Il sera prêt à être pushé.</p>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => void doValidate()}
              disabled={loading}
            >
              {loading ? 'Validation...' : 'Confirmer'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
            >
              Annuler
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
