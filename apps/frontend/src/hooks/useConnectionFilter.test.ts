import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import React from 'react';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn() },
}));

import { api } from '../lib/api.js';
import { useConnectionFilter } from './useConnectionFilter.js';

const CONNECTIONS = [
  { id: 'conn-1', name: 'Backend Jira', type: 'jira', isActive: true },
  { id: 'conn-2', name: 'ADO Frontend', type: 'azure_devops', isActive: true },
  { id: 'conn-3', name: 'Archivée', type: 'jira', isActive: false },
];

function createWrapper(initialPath: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
  };
}

describe('useConnectionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(CONNECTIONS);
  });

  it('should return only active connections loaded from API', async () => {
    const { result } = renderHook(() => useConnectionFilter(), { wrapper: createWrapper('/') });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.connections).toHaveLength(2);
    expect(result.current.connections.find((c) => c.id === 'conn-3')).toBeUndefined();
  });

  it('should default to null connectionId when no URL param', () => {
    const { result } = renderHook(() => useConnectionFilter(), { wrapper: createWrapper('/') });
    expect(result.current.connectionId).toBeNull();
  });

  it('should read connectionId from URL search params on mount', () => {
    const { result } = renderHook(() => useConnectionFilter(), {
      wrapper: createWrapper('/?connectionId=conn-1'),
    });
    expect(result.current.connectionId).toBe('conn-1');
  });

  it('should update URL search params when setConnectionId is called', async () => {
    const { result } = renderHook(() => useConnectionFilter(), { wrapper: createWrapper('/') });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setConnectionId('conn-1'); });

    expect(result.current.connectionId).toBe('conn-1');
  });

  it('should remove URL param when connectionId set to null', async () => {
    const { result } = renderHook(() => useConnectionFilter(), {
      wrapper: createWrapper('/?connectionId=conn-1'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setConnectionId(null); });

    expect(result.current.connectionId).toBeNull();
  });

  it('should preserve other URL params when changing connectionId', async () => {
    let capturedParams = new URLSearchParams();

    function ParamSpy({ children }: { children: React.ReactNode }) {
      const [sp] = useSearchParams();
      capturedParams = sp;
      return React.createElement(React.Fragment, null, children);
    }

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(
        MemoryRouter,
        { initialEntries: ['/?search=login&status=To+Do'] },
        React.createElement(ParamSpy, null, children),
      );
    }

    const { result } = renderHook(() => useConnectionFilter(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.setConnectionId('conn-1'); });

    await waitFor(() => expect(capturedParams.get('connectionId')).toBe('conn-1'));
    expect(capturedParams.get('search')).toBe('login');
    expect(capturedParams.get('status')).toBe('To Do');
  });

  it('should fallback to null if URL connectionId is not in connections list', async () => {
    const { result } = renderHook(() => useConnectionFilter(), {
      wrapper: createWrapper('/?connectionId=invalid-uuid-not-in-list'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.connectionId).toBeNull();
  });
});
