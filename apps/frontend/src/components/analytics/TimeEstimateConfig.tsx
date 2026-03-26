import { useState } from 'react';
import { api } from '../../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Card, CardContent } from '@/components/ui/card.js';

interface TimeEstimateConfigProps {
  currentValue: number;
  onSave: () => void;
  onCancel: () => void;
}

export function TimeEstimateConfig({ currentValue, onSave, onCancel }: TimeEstimateConfigProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put('/api/analytics/test-estimate', { manualTestMinutes: value });
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Temps estimé par test manuel
        </h3>
        <div className="flex items-end gap-3">
          <div>
            <Label className="block text-xs text-gray-500 mb-1">Minutes par test</Label>
            <Input
              data-testid="estimate-input"
              type="number"
              min={5}
              max={240}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-28"
            />
          </div>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Annuler
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
