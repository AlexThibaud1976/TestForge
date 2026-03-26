import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn() },
}));

// ── localStorage mock ─────────────────────────────────────────────────────────
const storageData: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storageData[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storageData[key]; }),
  clear: vi.fn(() => { Object.keys(storageData).forEach((k) => delete storageData[k]); }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// ── Imports ───────────────────────────────────────────────────────────────────
import { api } from '../lib/api.js';
import { useOnboardingState } from './useOnboardingState.js';

describe('useOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stored data
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    vi.mocked(api.get).mockResolvedValue([]);
  });

  it('should return loading=true initially', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.loading).toBe(true);
  });

  it('should return showWizard=false when onboarding_completed is set', async () => {
    storageData['onboarding_completed'] = 'true';
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showWizard).toBe(false);
  });

  it('should return showWizard=true when no connections and no LLM', async () => {
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showWizard).toBe(true);
    expect(result.current.hasConnection).toBe(false);
    expect(result.current.hasLLM).toBe(false);
  });

  it('should set hasConnection=true when connections exist', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([{ id: 'conn-1' }])
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasConnection).toBe(true);
  });

  it('should set hasLLM=true when llm-configs exist', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'llm-1' }]);
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasLLM).toBe(true);
  });

  it('should set hasFirstAnalysis=true from localStorage', async () => {
    storageData['testforge_first_analysis'] = 'true';
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasFirstAnalysis).toBe(true);
  });

  it('should return showWizard=false when all three steps are complete', async () => {
    storageData['testforge_first_analysis'] = 'true';
    vi.mocked(api.get)
      .mockResolvedValueOnce([{ id: 'conn-1' }])
      .mockResolvedValueOnce([{ id: 'llm-1' }]);
    const { result } = renderHook(() => useOnboardingState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.showWizard).toBe(false);
  });
});
