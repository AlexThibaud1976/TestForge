import { useState } from 'react';
import { api } from '../lib/api.js';
import type { ManualTestSet, ManualTestCase } from '@testforge/shared-types';

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  happy_path: '✅ Nominal',
  error_case: '❌ Erreur',
  edge_case: '⚠️ Limite',
  other: '🔹 Autre',
};

interface Props {
  set: ManualTestSet;
  onUpdated: (updated: ManualTestSet) => void;
}

export function ManualTestList({ set, onUpdated }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState(false);
  const [editCases, setEditCases] = useState<ManualTestCase[]>(set.testCases);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<ManualTestSet>(`/api/manual-test-sets/${set.id}`, {
        testCases: editCases.map((tc, i) => ({
          id: tc.id,
          title: tc.title,
          precondition: tc.precondition,
          priority: tc.priority,
          category: tc.category,
          steps: tc.steps.map((s) => ({ action: s.action, expectedResult: s.expectedResult })),
          sortOrder: i,
        })),
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const updateCase = (idx: number, field: string, value: unknown) => {
    setEditCases((prev) => prev.map((tc, i) => i === idx ? { ...tc, [field]: value } : tc));
  };

  const updateStep = (caseIdx: number, stepIdx: number, field: string, value: string) => {
    setEditCases((prev) => prev.map((tc, i) => {
      if (i !== caseIdx) return tc;
      const steps = tc.steps.map((s, si) => si === stepIdx ? { ...s, [field]: value } : s);
      return { ...tc, steps };
    }));
  };

  const cases = editing ? editCases : set.testCases;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{set.testCases.length} cas de test · v{set.version} · {set.status}</p>
        {set.status === 'draft' && (
          editing ? (
            <div className="flex gap-2">
              <button onClick={() => void handleSave()} disabled={saving}
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button onClick={() => { setEditing(false); setEditCases(set.testCases); }}
                className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50">
                Annuler
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50">
              ✏️ Éditer
            </button>
          )
        )}
      </div>
      {saveError && <p className="text-xs text-red-600">{saveError}</p>}

      {cases.map((tc, idx) => (
        <div key={tc.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(tc.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[tc.priority] ?? PRIORITY_COLORS['medium']}`}>
                {tc.priority}
              </span>
              <span className="text-xs text-gray-400 shrink-0">{CATEGORY_LABELS[tc.category]}</span>
              {editing ? (
                <input
                  value={tc.title}
                  onChange={(e) => updateCase(idx, 'title', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-sm font-medium text-gray-900 border-b border-indigo-300 outline-none bg-transparent"
                />
              ) : (
                <span className="text-sm font-medium text-gray-900 truncate">{tc.title}</span>
              )}
              {tc.externalId && (
                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded shrink-0 font-mono">
                  {tc.externalId}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0 ml-2">{tc.steps.length} steps {expanded[tc.id] ? '▲' : '▼'}</span>
          </button>

          {expanded[tc.id] && (
            <div className="px-4 pb-4 border-t border-gray-100 space-y-2 mt-2">
              {tc.precondition && (
                <p className="text-xs text-gray-500 italic">Précondition : {tc.precondition}</p>
              )}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left pb-1 w-8">#</th>
                    <th className="text-left pb-1 w-1/2">Action</th>
                    <th className="text-left pb-1">Résultat attendu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tc.steps.map((step, si) => (
                    <tr key={si}>
                      <td className="py-1 text-gray-400">{step.stepNumber}</td>
                      <td className="py-1 pr-2">
                        {editing ? (
                          <input value={step.action} onChange={(e) => updateStep(idx, si, 'action', e.target.value)}
                            className="w-full border-b border-gray-200 outline-none text-gray-700 bg-transparent" />
                        ) : (
                          <span className="text-gray-700">{step.action}</span>
                        )}
                      </td>
                      <td className="py-1">
                        {editing ? (
                          <input value={step.expectedResult} onChange={(e) => updateStep(idx, si, 'expectedResult', e.target.value)}
                            className="w-full border-b border-gray-200 outline-none text-gray-500 bg-transparent" />
                        ) : (
                          <span className="text-gray-500">{step.expectedResult}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {set.excludedCriteria.length > 0 && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">{set.excludedCriteria.length} critère(s) exclus (performance, sécurité...)</summary>
          <ul className="mt-1 space-y-0.5 pl-3">
            {set.excludedCriteria.map((e, i) => (
              <li key={i}>• {e.criterion} — <em>{e.reason}</em></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
