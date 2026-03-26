import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { GenerationCard } from './GenerationCard.js';
import type { GenerationHistoryItem } from '../../hooks/useHistoryData.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const makeGen = (overrides: Partial<GenerationHistoryItem> = {}): GenerationHistoryItem => ({
  id: 'gen-abc123',
  analysisId: 'analysis-1',
  framework: 'playwright',
  language: 'typescript',
  usedImprovedVersion: false,
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  status: 'success',
  durationMs: 2400,
  createdAt: '2024-01-15T10:00:00Z',
  userStoryId: 'us-abc',
  userStoryTitle: 'Login',
  userStoryExternalId: 'PROJ-1',
  connectionId: 'conn-1',
  connectionName: 'Backend',
  connectionType: 'jira',
  ...overrides,
});

function renderCard(gen: GenerationHistoryItem, onDownload = vi.fn()) {
  return render(
    <MemoryRouter>
      <GenerationCard generation={gen} onDownload={onDownload} />
    </MemoryRouter>,
  );
}

describe('GenerationCard', () => {
  it('should display framework and language dynamically (not hardcoded)', () => {
    renderCard(makeGen({ framework: 'selenium', language: 'python' }));
    expect(screen.getByText('Selenium · Python')).toBeDefined();
    expect(screen.queryByText('Playwright · TypeScript')).toBeNull();
  });

  it('should use gen.framework capitalized for playwright', () => {
    renderCard(makeGen({ framework: 'playwright', language: 'typescript' }));
    expect(screen.getByText('Playwright · Typescript')).toBeDefined();
  });

  it('should navigate to /stories/:userStoryId when clicking "Voir US"', () => {
    renderCard(makeGen({ userStoryId: 'us-abc' }));
    fireEvent.click(screen.getByText('Voir US'));
    expect(mockNavigate).toHaveBeenCalledWith('/stories/us-abc');
  });

  it('should disable "Voir US" button when userStoryId is null', () => {
    renderCard(makeGen({ userStoryId: null }));
    const btn = screen.getByText('Voir US').closest('button');
    expect(btn).toBeDefined();
    expect(btn?.disabled).toBe(true);
  });

  it('should show ✓ Succès badge for status success', () => {
    renderCard(makeGen({ status: 'success' }));
    expect(screen.getByText('✓ Succès')).toBeDefined();
  });

  it('should show ✗ Erreur badge for status error', () => {
    renderCard(makeGen({ status: 'error' }));
    expect(screen.getByText('✗ Erreur')).toBeDefined();
  });

  it('should call onDownload with generation id when clicking ZIP', () => {
    const onDownload = vi.fn();
    renderCard(makeGen({ status: 'success' }), onDownload);
    fireEvent.click(screen.getByText('⬇ ZIP'));
    expect(onDownload).toHaveBeenCalledWith('gen-abc123');
  });

  it('should not show ZIP button when status is error', () => {
    renderCard(makeGen({ status: 'error' }));
    expect(screen.queryByText('⬇ ZIP')).toBeNull();
  });

  it('should show usedImprovedVersion badge when true', () => {
    renderCard(makeGen({ usedImprovedVersion: true }));
    expect(screen.getByText('✨ version améliorée')).toBeDefined();
  });

  it('should display duration in seconds when durationMs is set', () => {
    renderCard(makeGen({ durationMs: 3000 }));
    expect(screen.getByText('3s')).toBeDefined();
  });
});
