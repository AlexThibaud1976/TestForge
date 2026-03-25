import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

interface Props {
  analysisId: string;
  improvedVersion: string;
  originalDescription: string;
}

export function WritebackButton({ analysisId, improvedVersion, originalDescription }: Props) {
  const { session } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWriteback = async () => {
    setPushing(true);
    setError(null);
    const res = await fetch(`/api/analyses/${analysisId}/writeback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ fields: { description: true, acceptanceCriteria: true } }),
    });
    setPushing(false);
    if (res.ok) {
      setDone(true);
      setShowDialog(false);
    } else {
      const data = await res.json();
      setError(data.error ?? 'Erreur lors du writeback');
    }
  };

  if (done) {
    return (
      <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        ✅ US mise à jour dans la source
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
      >
        ✏️ Mettre à jour l'US
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mettre à jour l'US dans la source</h3>
            <p className="text-sm text-gray-500 mb-4">
              Cette action va mettre à jour la description de l'US dans Jira ou Azure DevOps avec la version améliorée ci-dessous.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Avant</div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-gray-700 max-h-48 overflow-auto whitespace-pre-wrap">
                  {originalDescription || '(vide)'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Après</div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-700 max-h-48 overflow-auto whitespace-pre-wrap">
                  {improvedVersion}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">❌ {error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleWriteback}
                disabled={pushing}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {pushing ? 'Mise à jour...' : 'Confirmer la mise à jour'}
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-600 px-4 py-2 text-sm hover:text-gray-900"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
