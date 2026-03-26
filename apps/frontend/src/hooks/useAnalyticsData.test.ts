import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn() },
}));

import { api } from '../lib/api.js';
import { useAnalyticsData, type AnalyticsDashboard } from './useAnalyticsData.js';

const mockDashboard: AnalyticsDashboard = {
  kpis: { averageScore: 72, totalAnalyses: 10, totalGenerations: 8, manualTestMinutes: 30, timeSavedMinutes: 240 },
  distribution: { green: 5, yellow: 3, red: 2 },
  weeklyScores: [{ week: '2024-W01', averageScore: 70, count: 3 }],
  byConnection: [{
    connectionId: 'conn-1', connectionName: 'Backend', connectionType: 'jira',
    averageScore: 72, analysisCount: 10, generationCount: 8,
  }],
};

describe('useAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockDashboard);
  });

  it('should return loading true initially', () => {
    const { result } = renderHook(() => useAnalyticsData(null));
    expect(result.current.loading).toBe(true);
  });

  it('should fetch from /api/analytics/dashboard', async () => {
    const { result } = renderHook(() => useAnalyticsData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/api/analytics/dashboard');
  });

  it('should include connectionId in URL when provided', async () => {
    const { result } = renderHook(() => useAnalyticsData('conn-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/api/analytics/dashboard?connectionId=conn-123');
  });

  it('should return data after successful fetch', async () => {
    const { result } = renderHook(() => useAnalyticsData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockDashboard);
    expect(result.current.error).toBeNull();
  });

  it('should set error on API failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network failure'));
    const { result } = renderHook(() => useAnalyticsData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network failure');
    expect(result.current.data).toBeNull();
  });

  it('should refetch when refetch() is called', async () => {
    const { result } = renderHook(() => useAnalyticsData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledTimes(1);

    act(() => { result.current.refetch(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
