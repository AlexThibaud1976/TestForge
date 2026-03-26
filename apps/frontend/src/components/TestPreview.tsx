import { parseTestSpec, STEP_ICONS, type PreviewScenario, type PreviewStep } from '../lib/testPreviewParser.js';

// ─── Couleurs par type ────────────────────────────────────────────────────────

const STEP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  navigate: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  fill: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  click: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  select: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  assert: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  wait: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
  other: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500' },
};

// ─── Step node ────────────────────────────────────────────────────────────────

function StepNode({ step, isLast }: { step: PreviewStep; isLast: boolean }) {
  const colors = STEP_COLORS[step.type] ?? STEP_COLORS['other']!;

  return (
    <div className="flex gap-3">
      {/* Ligne verticale + nœud */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm shrink-0 ${colors.bg} ${colors.border}`}>
          {STEP_ICONS[step.type]}
        </div>
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1" style={{ minHeight: '16px' }} />}
      </div>

      {/* Contenu */}
      <div className={`mb-3 flex-1 pb-1`}>
        <p className={`text-sm font-medium ${colors.text}`}>{step.description}</p>
        {step.value && (
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate" title={step.value}>
            {step.value}
          </p>
        )}
        {step.target && !step.value && (
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate" title={step.target}>
            {step.target}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Scénario ─────────────────────────────────────────────────────────────────

function ScenarioCard({ scenario }: { scenario: PreviewScenario }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-700 font-mono truncate" title={scenario.name}>
          🧪 {scenario.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{scenario.steps.length} étape{scenario.steps.length > 1 ? 's' : ''}</p>
      </div>
      <div className="p-4">
        {scenario.steps.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Aucune action détectée dans ce scénario.</p>
        ) : (
          scenario.steps.map((step, i) => (
            <StepNode key={i} step={step} isLast={i === scenario.steps.length - 1} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  specCode: string;
  fixturesJson?: string;
}

export function TestPreview({ specCode, fixturesJson }: Props) {
  const scenarios = parseTestSpec(specCode, fixturesJson);

  if (scenarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">🔍</p>
        <p className="text-sm">Preview non disponible pour ce code.</p>
        <p className="text-xs mt-1 text-gray-300">Aucune action Playwright détectée (goto, fill, click, expect).</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">
          {scenarios.length} scénario{scenarios.length > 1 ? 's' : ''} · {scenarios.reduce((s, sc) => s + sc.steps.length, 0)} actions au total
        </p>
        <div className="flex gap-3 text-xs text-gray-400">
          {['navigate', 'fill', 'click', 'assert'].map((type) => (
            <span key={type} className="flex items-center gap-0.5">
              {STEP_ICONS[type as keyof typeof STEP_ICONS]} {type}
            </span>
          ))}
        </div>
      </div>
      {scenarios.map((scenario, i) => (
        <ScenarioCard key={i} scenario={scenario} />
      ))}
    </div>
  );
}
