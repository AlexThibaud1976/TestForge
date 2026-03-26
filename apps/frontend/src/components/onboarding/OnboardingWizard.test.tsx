import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── localStorage mock ─────────────────────────────────────────────────────────
const storageData: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storageData[key] ?? null,
  setItem: (key: string, value: string) => { storageData[key] = value; },
  removeItem: (key: string) => { delete storageData[key]; },
  clear: () => { Object.keys(storageData).forEach((k) => delete storageData[k]); },
});

// Mock step components to isolate wizard logic
vi.mock('./StepConnection.js', () => ({
  StepConnection: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-connection">
      <button data-testid="complete-step-1" onClick={onComplete}>Compléter étape 1</button>
    </div>
  ),
}));

vi.mock('./StepLLM.js', () => ({
  StepLLM: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-llm">
      <button data-testid="complete-step-2" onClick={onComplete}>Compléter étape 2</button>
    </div>
  ),
}));

vi.mock('./StepFirstAnalysis.js', () => ({
  StepFirstAnalysis: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="step-analysis">
      <button data-testid="complete-step-3" onClick={onComplete}>Compléter étape 3</button>
    </div>
  ),
}));

vi.mock('./ConfettiAnimation.js', () => ({
  ConfettiAnimation: () => <div data-testid="confetti" />,
}));

import { OnboardingWizard } from './OnboardingWizard.js';

const defaultProps = {
  hasConnection: false,
  hasLLM: false,
  hasFirstAnalysis: false,
  onComplete: vi.fn(),
};

function renderWizard(props = defaultProps) {
  return render(
    <MemoryRouter>
      <OnboardingWizard {...props} />
    </MemoryRouter>,
  );
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(storageData).forEach((k) => delete storageData[k]);
  });

  it('should show "Étape 1/3" for a new user', () => {
    renderWizard();
    expect(screen.getByText(/Étape 1\/3/)).toBeDefined();
  });

  it('should render StepConnection as step 1', () => {
    renderWizard();
    expect(screen.getByTestId('step-connection')).toBeDefined();
  });

  it('should start at step 2 when connection already exists', () => {
    renderWizard({ ...defaultProps, hasConnection: true });
    expect(screen.getByText(/Étape 2\/3/)).toBeDefined();
    expect(screen.getByTestId('step-llm')).toBeDefined();
  });

  it('should start at step 3 when connection and LLM already exist', () => {
    renderWizard({ ...defaultProps, hasConnection: true, hasLLM: true });
    expect(screen.getByText(/Étape 3\/3/)).toBeDefined();
    expect(screen.getByTestId('step-analysis')).toBeDefined();
  });

  it('should advance to step 2 when "Passer" is clicked on step 1', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Passer'));
    expect(screen.getByText(/Étape 2\/3/)).toBeDefined();
    expect(screen.getByTestId('step-llm')).toBeDefined();
  });

  it('should go back to step 1 when "Précédent" is clicked on step 2', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Passer')); // go to step 2
    fireEvent.click(screen.getByText('← Précédent'));
    expect(screen.getByText(/Étape 1\/3/)).toBeDefined();
  });

  it('should have "Suivant →" disabled when step is not completed', () => {
    renderWizard();
    const nextBtn = screen.getByText('Suivant →').closest('button');
    expect(nextBtn?.disabled).toBe(true);
  });

  it('should enable "Suivant →" after step completion', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('complete-step-1'));
    const nextBtn = screen.getByText('Suivant →').closest('button');
    expect(nextBtn?.disabled).toBe(false);
  });

  it('should advance to step 2 via "Suivant →" after step 1 completion', () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('complete-step-1')); // marks step 1 done, enables Suivant
    fireEvent.click(screen.getByText('Suivant →')); // user explicitly advances
    expect(screen.getByText(/Étape 2\/3/)).toBeDefined();
  });

  it('should show celebration screen after step 3 completion', () => {
    renderWizard();
    // Skip to step 3
    fireEvent.click(screen.getByText('Passer'));
    fireEvent.click(screen.getByText('Passer'));
    // Complete step 3
    fireEvent.click(screen.getByTestId('complete-step-3'));
    expect(screen.getByText('TestForge est prêt !')).toBeDefined();
    expect(screen.getByTestId('confetti')).toBeDefined();
  });

  it('should show celebration when "Passer" is clicked on step 3', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Passer')); // step 1 → 2
    fireEvent.click(screen.getByText('Passer')); // step 2 → 3
    fireEvent.click(screen.getByText('Passer')); // step 3 → celebration
    expect(screen.getByText('TestForge est prêt !')).toBeDefined();
  });

  it('should set onboarding_completed in localStorage on finish', () => {
    renderWizard();
    fireEvent.click(screen.getByText('Passer'));
    fireEvent.click(screen.getByText('Passer'));
    fireEvent.click(screen.getByText('Passer')); // celebration
    fireEvent.click(screen.getByText('Explorer mes User Stories →'));
    expect(localStorage.getItem('onboarding_completed')).toBe('true');
  });

  it('should call onComplete when "Explorer" is clicked', () => {
    const onComplete = vi.fn();
    render(
      <MemoryRouter>
        <OnboardingWizard {...defaultProps} onComplete={onComplete} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Passer'));
    fireEvent.click(screen.getByText('Passer'));
    fireEvent.click(screen.getByText('Passer')); // celebration
    fireEvent.click(screen.getByText('Explorer mes User Stories →'));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
