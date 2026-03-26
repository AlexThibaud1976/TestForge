import { useState } from 'react';
import { api } from '../lib/api.js';
import type { ManualTestSet } from '@testforge/shared-types';
import { Button } from './ui/button.js';

interface Props {
  analysisId: string;
  hasExisting: boolean;
  onGenerated: (set: ManualTestSet) => void;
}

export function ManualTestGenerateButton({ analysisId, hasExisting, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [useImproved, setUseImproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doGenerate = async () => {
    setLoading(true);
    setError(null);
    setShowConfirm(false);
    try {
      const result = await api.post<ManualTestSet & { lowScoreWarning?: boolean }>(
        `/api/analyses/${analysisId}/manual-tests`,
        { useImprovedVersion: useImproved },
      );
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (hasExisting) { setShowConfirm(true); } else { void doGenerate(); }
  };

  return (
    <div>
      {!showConfirm ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={useImproved} onChange={(e) => setUseImproved(e.target.checked)} className="rounded" />
              Utiliser la version améliorée
            </label>
          </div>
          <Button
            variant="indigo"
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? '⏳ Génération...' : '📋 Générer les tests manuels'}
          </Button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-yellow-800">⚠️ Une génération existe déjà. La remplacer ?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-yellow-600 text-white hover:bg-yellow-700"
              onClick={() => void doGenerate()}
              disabled={loading}
            >
              {loading ? 'Génération...' : 'Régénérer'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
