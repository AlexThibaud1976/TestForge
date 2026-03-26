import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

export interface BatchItemResult {
  score: number;
  status: 'success' | 'error';
}

export interface BatchState {
  batchId: string | null;
  total: number;
  completed: number;
  results: Map<string, BatchItemResult>;
  done: boolean;
  running: boolean;
}

const INITIAL_STATE: BatchState = {
  batchId: null,
  total: 0,
  completed: 0,
  results: new Map(),
  done: false,
  running: false,
};

/** Intervalle de polling en ms */
export const POLL_INTERVAL_MS = 2000;
/** Nombre max de cycles avant abandon (~5 min) */
const MAX_POLLS = 150;

interface AnalysisResponse {
  id: string;
  scoreGlobal: number;
  createdAt: string;
}

export function useBatchAnalysis() {
  const [state, setState] = useState<BatchState>(INITIAL_STATE);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Interroge l'API pour chaque story en attente.
   * Marque une story comme complétée dès qu'une analyse existe
   * (nouvelle ou en cache — le résultat est valide dans les deux cas).
   */
  const pollOnce = useCallback(async () => {
    pollCountRef.current += 1;

    // Abandon après MAX_POLLS cycles (stories non analysées → erreur)
    if (pollCountRef.current > MAX_POLLS) {
      stopPolling();
      const remaining = Array.from(pendingIdsRef.current);
      if (remaining.length > 0) {
        setState((prev) => {
          const results = new Map(prev.results);
          remaining.forEach((id) => {
            results.set(id, { score: 0, status: 'error' });
          });
          pendingIdsRef.current.clear();
          return { ...prev, completed: results.size, results, done: true };
        });
      }
      return;
    }

    const pending = Array.from(pendingIdsRef.current);
    if (pending.length === 0) {
      stopPolling();
      return;
    }

    await Promise.allSettled(
      pending.map(async (userStoryId) => {
        try {
          const analysis = await api.get<AnalysisResponse | null>(
            `/api/analyses?userStoryId=${userStoryId}`,
          );
          if (!analysis) return; // pas encore disponible

          pendingIdsRef.current.delete(userStoryId);
          setState((prev) => {
            const results = new Map(prev.results);
            results.set(userStoryId, {
              score: analysis.scoreGlobal,
              status: 'success',
            });
            const completed = results.size;
            const done = completed >= prev.total;
            if (done) stopPolling();
            return { ...prev, completed, results, done };
          });
        } catch {
          // Analyse pas encore prête — on réessaiera au prochain cycle
        }
      }),
    );
  }, [stopPolling]);

  const startBatch = useCallback(
    async (userStoryIds: string[]) => {
      stopPolling();
      pollCountRef.current = 0;
      pendingIdsRef.current = new Set(userStoryIds);

      setState({
        batchId: null,
        total: userStoryIds.length,
        completed: 0,
        results: new Map(),
        done: false,
        running: true,
      });

      const { batchId } = await api.post<{ batchId: string; total: number }>(
        '/api/analyses/batch',
        { userStoryIds },
      );

      setState((prev) => ({ ...prev, batchId }));

      // Démarrer le polling toutes les POLL_INTERVAL_MS ms
      pollIntervalRef.current = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, pollOnce],
  );

  // Nettoyage au démontage
  useEffect(() => {
    return () => { stopPolling(); };
  }, [stopPolling]);

  return { state, startBatch };
}
