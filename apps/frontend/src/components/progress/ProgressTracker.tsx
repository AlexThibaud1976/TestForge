import { useEffect, useRef, useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ProgressStep {
  key: string;
  label: string;
}

export interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  estimatedMs: number;
  startedAt: number;
  errorMessage?: string;
}

// ─── Étapes standard ──────────────────────────────────────────────────────────

export const ANALYSIS_STEPS: ProgressStep[] = [
  { key: 'preparing', label: 'Préparation' },
  { key: 'calling_llm', label: 'Appel LLM' },
  { key: 'finalizing', label: 'Résultat' },
];

export const GENERATION_STEPS: ProgressStep[] = [
  { key: 'preparing', label: 'Préparation' },
  { key: 'calling_llm', label: 'Appel LLM' },
  { key: 'finalizing', label: 'Résultat' },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export function ProgressTracker({
  steps,
  currentStep,
  status,
  estimatedMs,
  startedAt,
  errorMessage,
}: ProgressTrackerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, status]);

  // Progression de la barre
  const rawProgress = status === 'success' ? 1 : Math.min(elapsed / estimatedMs, 0.95);
  const progressPct = Math.round(rawProgress * 100);

  // Message de délai
  let delayMessage: string | null = null;
  if (status !== 'success' && status !== 'error') {
    if (elapsed > estimatedMs * 3) {
      delayMessage = 'Vérification en cours...';
    } else if (elapsed > estimatedMs * 1.5) {
      delayMessage = 'Un peu plus long que d\'habitude...';
    }
  }

  // Index de l'étape courante
  const currentStepIndex = currentStep ? steps.findIndex((s) => s.key === currentStep) : -1;

  return (
    <div className="space-y-3 py-2">
      {/* Étapes */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const isDone = status === 'success' || currentStepIndex > i;
          const isCurrent = status !== 'success' && currentStepIndex === i;
          const isError = status === 'error' && currentStepIndex === i;

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isError
                      ? 'bg-red-100 text-red-600 ring-2 ring-red-300'
                      : isDone
                      ? 'bg-green-100 text-green-700'
                      : isCurrent
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className={`text-xs text-center ${
                    isError
                      ? 'text-red-600 font-medium'
                      : isDone
                      ? 'text-green-700 font-medium'
                      : isCurrent
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-px flex-1 mt-[-12px] transition-colors ${
                    isDone ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${
              status === 'error'
                ? 'bg-red-400'
                : status === 'success'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {status === 'success'
              ? `Terminé en ${Math.round(elapsed / 1000)}s`
              : `${Math.round(elapsed / 1000)}s / ~${Math.round(estimatedMs / 1000)}s`}
          </span>
          {delayMessage && (
            <span className="text-xs text-yellow-600">{delayMessage}</span>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {status === 'error' && errorMessage && (
        <p className="text-xs text-red-600 bg-red-50 rounded-md p-2">{errorMessage}</p>
      )}
    </div>
  );
}
