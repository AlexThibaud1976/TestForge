import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

type RowStatus = 'pending' | 'success' | 'error';

interface RealtimeRow {
  id: string;
  status: RowStatus;
  [key: string]: unknown;
}

/**
 * Souscrit aux changements d'une ligne spécifique d'une table Supabase.
 * Appelle `onUpdate` dès que la ligne change (INSERT ou UPDATE).
 */
export function useRealtimeRow<T extends RealtimeRow>(
  table: string,
  id: string | null,
  onUpdate: (row: T) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`${table}:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            onUpdateRef.current(payload.new as T);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, id]);
}
