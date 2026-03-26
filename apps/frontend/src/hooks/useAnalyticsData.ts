import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export interface AnalyticsDashboard {
  kpis: {
    averageScore: number;
    totalAnalyses: number;
    totalGenerations: number;
    manualTestMinutes: number;
    timeSavedMinutes: number;
  };
  distribution: { green: number; yellow: number; red: number };
  weeklyScores: Array<{ week: string; averageScore: number; count: number }>;
  byConnection: Array<{
    connectionId: string | null;
    connectionName: string | null;
    connectionType: string | null;
    averageScore: number;
    analysisCount: number;
    generationCount: number;
  }>;
}

export interface UseAnalyticsReturn {
  data: AnalyticsDashboard | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnalyticsData(connectionId: string | null): UseAnalyticsReturn {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
    api
      .get<AnalyticsDashboard>(`/api/analytics/dashboard${params}`)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [connectionId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
