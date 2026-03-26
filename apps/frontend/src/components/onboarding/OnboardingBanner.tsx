import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { Button } from '../ui/button.js';

interface Team { plan: string; }
interface Connection { id: string; }
interface LLMConfig { id: string; }

type Step = 'connection' | 'llm' | 'analyze';

interface OnboardingStep {
  id: Step;
  label: string;
  description: string;
  action: string;
  path: string;
  done: boolean;
}

export function OnboardingBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleStorage = () => void loadSteps();
    window.addEventListener('testforge_analysis_done', handleStorage);
    return () => window.removeEventListener('testforge_analysis_done', handleStorage);
  }, []);

  const loadSteps = async () => {
    const isDismissed = localStorage.getItem('onboarding_dismissed') === 'true';
    if (isDismissed) { setDismissed(true); setLoading(false); return; }

    const connections = await api.get<{id:string}[]>('/api/connections').catch(() => []);
    const llmConfigs = await api.get<{id:string}[]>('/api/llm-configs').catch(() => []);
    const hasConnection = (connections as {id:string}[]).length > 0;
    const hasLLM = (llmConfigs as {id:string}[]).length > 0;

    setSteps([
      {
        id: 'connection', label: 'Connecter Jira ou Azure DevOps',
        description: 'Importez vos user stories depuis votre outil de gestion de projet.',
        action: 'Ajouter une connexion', path: '/settings/connections', done: hasConnection,
      },
      {
        id: 'llm', label: 'Configurer un provider LLM',
        description: 'Ajoutez votre clé OpenAI, Anthropic ou Azure OpenAI pour activer l\'analyse.',
        action: 'Configurer le LLM', path: '/settings/llm', done: hasLLM,
      },
      {
        id: 'analyze', label: 'Analyser votre première US',
        description: 'Sélectionnez une user story et lancez l\'analyse qualité.',
        action: 'Voir les US', path: '/stories',
        done: localStorage.getItem('testforge_first_analysis') === 'true',
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    void loadSteps();
  }, [location.pathname]);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
  };

  if (loading || dismissed) return null;

  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  const currentStep = steps.find((s) => !s.done);
  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div className="mx-6 mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-blue-900">
            Démarrage rapide — {completedCount}/{steps.length} étapes complétées
          </h3>
          <p className="text-xs text-blue-600 mt-0.5">Suivez ces étapes pour générer vos premiers tests</p>
        </div>
        <Button variant="ghost" size="xs" onClick={handleDismiss}>×</Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-blue-200 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div key={step.id} className={`relative bg-white rounded-lg p-3 border transition-all ${
            step.done
              ? 'border-green-200 opacity-60'
              : step.id === currentStep?.id
              ? 'border-blue-300 ring-1 ring-blue-200'
              : 'border-gray-200 opacity-50'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step.done ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {step.done ? '✓' : i + 1}
              </span>
              <span className="text-xs font-medium text-gray-800">{step.label}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">{step.description}</p>
            {!step.done && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => void navigate(step.path)}
              >
                {step.action} →
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
