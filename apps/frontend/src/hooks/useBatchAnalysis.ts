import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

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

export function useBatchAnalysis() {
  const [state, setState] = useState<BatchState>(INITIAL_STATE);
  const pendingIdsRef = useRef<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const startBatch = useCallback(async (userStoryIds: string[]) => {
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

    // Écouter les INSERTs sur la table analyses via Supabase Realtime
    channelRef.current = supabase
      .channel(`batch-${batchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analyses' },
        (payload) => {
          const row = payload.new as {
            user_story_id: string;
            score_global: number;
          };

          // Filtrer côté client : seuls les IDs du batch courant
          if (!pendingIdsRef.current.has(row.user_story_id)) return;

          setState((prev) => {
            const results = new Map(prev.results);
            results.set(row.user_story_id, {
              score: row.score_global,
              status: 'success',
            });
            const completed = prev.completed + 1;
            return {
              ...prev,
              completed,
              results,
              done: completed >= prev.total,
            };
          });
        },
      )
      .subscribe();
  }, []);

  // Nettoyer le channel Realtime au démontage
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { state, startBatch };
}
