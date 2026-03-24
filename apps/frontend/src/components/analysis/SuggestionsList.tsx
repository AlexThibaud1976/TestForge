interface Suggestion {
  priority: 'critical' | 'recommended' | 'optional';
  issue: string;
  suggestion: string;
}

interface SuggestionsListProps {
  suggestions: Suggestion[];
}

const PRIORITY_CONFIG = {
  critical:    { label: 'Critique',    className: 'bg-red-100 text-red-700 border-red-200' },
  recommended: { label: 'Recommandé', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  optional:    { label: 'Optionnel',  className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const PRIORITY_ORDER = { critical: 0, recommended: 1, optional: 2 };

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-gray-400 italic">Aucune suggestion — cette US est de bonne qualité.</p>;
  }

  const sorted = [...suggestions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => {
        const config = PRIORITY_CONFIG[s.priority];
        return (
          <div key={i} className="border border-gray-100 rounded-lg p-3 bg-white">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${config.className}`}>
                {config.label}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{s.issue}</p>
                <p className="text-sm text-gray-500 mt-0.5">→ {s.suggestion}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
