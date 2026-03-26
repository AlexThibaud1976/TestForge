import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export interface OnboardingState {
  showWizard: boolean;
  hasConnection: boolean;
  hasLLM: boolean;
  hasFirstAnalysis: boolean;
  loading: boolean;
}

export function useOnboardingState(): OnboardingState {
  const [state, setState] = useState<OnboardingState>({
    showWizard: false,
    hasConnection: false,
    hasLLM: false,
    hasFirstAnalysis: false,
    loading: true,
  });

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed') === 'true';
    if (completed) {
      setState({
        showWizard: false,
        hasConnection: false,
        hasLLM: false,
        hasFirstAnalysis: false,
        loading: false,
      });
      return;
    }

    const hasFirstAnalysis = localStorage.getItem('testforge_first_analysis') === 'true';

    Promise.all([
      api.get<{ id: string }[]>('/api/connections').catch(() => [] as { id: string }[]),
      api.get<{ id: string }[]>('/api/llm-configs').catch(() => [] as { id: string }[]),
    ]).then(([connections, llmConfigs]) => {
      const hasConnection = connections.length > 0;
      const hasLLM = llmConfigs.length > 0;
      const showWizard = !hasConnection || !hasLLM || !hasFirstAnalysis;
      setState({ showWizard, hasConnection, hasLLM, hasFirstAnalysis, loading: false });
    });
  }, []);

  return state;
}
