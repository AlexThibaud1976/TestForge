import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export interface Connection {
  id: string;
  name: string;
  type: 'jira' | 'azure_devops';
  isActive: boolean;
}

export interface UseConnectionFilterReturn {
  connections: Connection[];
  connectionId: string | null;
  setConnectionId: (id: string | null) => void;
  loading: boolean;
}

export function useConnectionFilter(): UseConnectionFilterReturn {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    api
      .get<Connection[]>('/api/connections')
      .then((data) => setConnections(data.filter((c) => c.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const rawConnectionId = searchParams.get('connectionId');

  // While loading: keep raw URL value (can't validate yet).
  // After loading: validate against loaded connections; fallback to null if not found.
  const connectionId: string | null =
    rawConnectionId === null
      ? null
      : loading
        ? rawConnectionId
        : connections.some((c) => c.id === rawConnectionId)
          ? rawConnectionId
          : null;

  // Clean invalid connectionId from URL after connections have loaded
  useEffect(() => {
    if (
      !loading &&
      rawConnectionId !== null &&
      !connections.some((c) => c.id === rawConnectionId)
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('connectionId');
          return next;
        },
        { replace: true },
      );
    }
  }, [loading, connections, rawConnectionId, setSearchParams]);

  const setConnectionId = useCallback(
    (id: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id) {
          next.set('connectionId', id);
        } else {
          next.delete('connectionId');
        }
        return next;
      });
    },
    [setSearchParams],
  );

  return { connections, connectionId, setConnectionId, loading };
}
