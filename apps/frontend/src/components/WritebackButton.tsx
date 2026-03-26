import { useState } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.js';

interface Props {
  analysisId: string;
  improvedVersion: string;
  originalDescription: string;
}

export function WritebackButton({ analysisId, improvedVersion, originalDescription }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWriteback = async () => {
    setPushing(true);
    setError(null);
    try {
      await api.post(`/api/analyses/${analysisId}/writeback`, {
        fields: { description: true, acceptanceCriteria: true },
      });
      setDone(true);
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du writeback');
    } finally {
      setPushing(false);
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
      <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
        ✏️ Mettre à jour l'US
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Mettre à jour l'US dans la source</DialogTitle>
            <DialogDescription>
              La version améliorée sera poussée dans Jira ou Azure DevOps.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button
              onClick={() => void handleWriteback()}
              disabled={pushing}
              variant="indigo"
            >
              {pushing ? 'Mise à jour...' : 'Confirmer la mise à jour'}
            </Button>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
