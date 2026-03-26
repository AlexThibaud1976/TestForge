import { useState } from 'react';
import { StepConnection } from './StepConnection.js';
import { StepLLM } from './StepLLM.js';
import { StepFirstAnalysis } from './StepFirstAnalysis.js';
import { ConfettiAnimation } from './ConfettiAnimation.js';

interface OnboardingWizardProps {
  hasConnection: boolean;
  hasLLM: boolean;
  hasFirstAnalysis: boolean;
  onComplete: () => void;
}

const STEP_LABELS = ['Connecter Jira / ADO', 'Configurer le LLM', 'Première analyse'];

export function OnboardingWizard({
  hasConnection,
  hasLLM,
  hasFirstAnalysis,
  onComplete,
}: OnboardingWizardProps) {
  // Partir de la première étape non complétée
  const initialStep: 1 | 2 | 3 = !hasConnection ? 1 : !hasLLM ? 2 : 3;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);
  const [stepCompleted, setStepCompleted] = useState<[boolean, boolean, boolean]>([
    hasConnection,
    hasLLM,
    hasFirstAnalysis,
  ]);
  const [showCelebration, setShowCelebration] = useState(false);

  const markCompleted = (stepIndex: 0 | 1 | 2) => {
    setStepCompleted((prev) => {
      const next = [...prev] as [boolean, boolean, boolean];
      next[stepIndex] = true;
      return next;
    });
    // Étape 3 complétée → célébration immédiate
    // Étapes 1-2 : active "Suivant →", l'utilisateur clique pour avancer
    if (stepIndex === 2) {
      setShowCelebration(true);
    }
  };

  const handleSkip = () => {
    if (currentStep === 3) {
      setShowCelebration(true);
    } else {
      setCurrentStep((currentStep + 1) as 2 | 3);
    }
  };

  const handleNext = () => {
    if (currentStep === 3) {
      setShowCelebration(true);
    } else {
      setCurrentStep((currentStep + 1) as 2 | 3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const isCurrentStepCompleted = stepCompleted[currentStep - 1] ?? false;

  // ── Écran de célébration ─────────────────────────────────────────────────

  if (showCelebration) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <ConfettiAnimation />
        <div className="bg-white rounded-xl p-10 max-w-md w-full text-center relative z-10">
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-xl font-semibold text-gray-900">TestForge est prêt !</h2>
          <p className="text-gray-500 mt-2">Votre première US a été analysée avec succès.</p>
          <button
            onClick={handleFinish}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Explorer mes User Stories →
          </button>
        </div>
      </div>
    );
  }

  // ── Wizard modal ─────────────────────────────────────────────────────────

  const stepComponents: [React.ReactNode, React.ReactNode, React.ReactNode] = [
    <StepConnection key="conn" onComplete={() => markCompleted(0)} />,
    <StepLLM key="llm" onComplete={() => markCompleted(1)} />,
    <StepFirstAnalysis key="analysis" onComplete={() => markCompleted(2)} />,
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bienvenue sur TestForge ! 🔧</h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivez ces 3 étapes pour générer vos premiers tests automatisés.
          </p>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-1 mb-2">
            {([1, 2, 3] as const).map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    s === currentStep
                      ? 'bg-blue-600 text-white'
                      : stepCompleted[s - 1]
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepCompleted[s - 1] && s !== currentStep ? '✓' : s}
                </div>
                {s < 3 && <div className="w-10 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Étape {currentStep}/3 — {STEP_LABELS[currentStep - 1]}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {stepComponents[currentStep - 1]}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Passer
          </button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                ← Précédent
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!isCurrentStepCompleted}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
