import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock the hook so tests control state
vi.mock('../../hooks/useBatchAnalysis.js', () => ({
  useBatchAnalysis: vi.fn(),
}));

// Mock BatchSummary to isolate Modal tests
vi.mock('./BatchSummary.js', () => ({
  BatchSummary: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="batch-summary">
      <button onClick={onClose}>Fermer résumé</button>
    </div>
  ),
}));

import { useBatchAnalysis } from '../../hooks/useBatchAnalysis.js';
import { BatchAnalysisModal } from './BatchAnalysisModal.js';

const mockStartBatch = vi.fn();

const stories = [
  { id: 'us-1', title: 'Login utilisateur', externalId: 'PROJ-1' },
  { id: 'us-2', title: 'Register', externalId: 'PROJ-2' },
];

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <BatchAnalysisModal stories={stories} onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('BatchAnalysisModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBatchAnalysis).mockReturnValue({
      state: {
        batchId: null,
        total: 2,
        completed: 0,
        results: new Map(),
        done: false,
        running: true,
      },
      startBatch: mockStartBatch,
    });
  });

  it('should call startBatch with story IDs on mount', () => {
    renderModal();
    expect(mockStartBatch).toHaveBeenCalledWith(['us-1', 'us-2']);
  });

  it('should render story titles in the list', () => {
    renderModal();
    expect(screen.getByText('Login utilisateur')).toBeDefined();
    expect(screen.getByText('Register')).toBeDefined();
  });

  it('should render externalIds in the list', () => {
    renderModal();
    expect(screen.getByText('PROJ-1')).toBeDefined();
    expect(screen.getByText('PROJ-2')).toBeDefined();
  });

  it('should show progress counter', () => {
    renderModal();
    expect(screen.getByText('0/2')).toBeDefined();
  });

  it('should show spinner for pending stories and score for completed ones', () => {
    const results = new Map([
      ['us-1', { score: 72, status: 'success' as const }],
    ]);
    vi.mocked(useBatchAnalysis).mockReturnValue({
      state: {
        batchId: 'batch-1',
        total: 2,
        completed: 1,
        results,
        done: false,
        running: true,
      },
      startBatch: mockStartBatch,
    });

    renderModal();
    expect(screen.getByText('✓ 72')).toBeDefined();
    expect(screen.getByText('1/2')).toBeDefined();
  });

  it('should show BatchSummary when done=true', () => {
    vi.mocked(useBatchAnalysis).mockReturnValue({
      state: {
        batchId: 'batch-1',
        total: 2,
        completed: 2,
        results: new Map([
          ['us-1', { score: 72, status: 'success' as const }],
          ['us-2', { score: 55, status: 'success' as const }],
        ]),
        done: true,
        running: false,
      },
      startBatch: mockStartBatch,
    });

    renderModal();
    expect(screen.getByTestId('batch-summary')).toBeDefined();
  });

  it('should not show BatchSummary when not done', () => {
    renderModal();
    expect(screen.queryByTestId('batch-summary')).toBeNull();
  });

  it('should show close background button when not done', () => {
    renderModal();
    expect(screen.getByText('Fermer (continue en arrière-plan)')).toBeDefined();
  });

  it('should call onClose when background close button is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByText('Fermer (continue en arrière-plan)'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
