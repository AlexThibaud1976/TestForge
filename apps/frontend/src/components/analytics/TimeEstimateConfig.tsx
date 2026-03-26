import { useState } from 'react';
import { api } from '../../lib/api.js';

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
    <div className="bg-white border border-gray-200 rounded-xl p-5 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Temps estimé par test manuel
      </h3>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Minutes par test</label>
          <input
            data-testid="estimate-input"
            type="number"
            min={5}
            max={240}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-28 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
}
