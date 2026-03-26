import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Hoisted mock state ─────────────────────────────────────────────────────────

const { realtimeCallback } = vi.hoisted(() => ({
  realtimeCallback: { current: null as ((payload: unknown) => void) | null },
}));

vi.mock('../lib/api.js', () => ({
  api: { post: vi.fn() },
}));

vi.mock('../lib/supabase.js', () => {
  const mockChannel = {
    on: vi.fn().mockImplementation(
      (_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
        realtimeCallback.current = cb;
        return mockChannel;
      },
    ),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    },
  };
});

// ── Imports après mocks ────────────────────────────────────────────────────────

import { api } from '../lib/api.js';
import { useBatchAnalysis } from './useBatchAnalysis.js';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useBatchAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback.current = null;
    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 2 });
  });

  it('should have initial state with running=false', () => {
    const { result } = renderHook(() => useBatchAnalysis());
    expect(result.current.state.running).toBe(false);
    expect(result.current.state.total).toBe(0);
    expect(result.current.state.done).toBe(false);
  });

  it('should set running=true and total when startBatch is called', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    act(() => { void result.current.startBatch(['us-1', 'us-2']); });

    expect(result.current.state.running).toBe(true);
    expect(result.current.state.total).toBe(2);
  });

  it('should call POST /api/analyses/batch with userStoryIds', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });

    expect(api.post).toHaveBeenCalledWith('/api/analyses/batch', {
      userStoryIds: ['us-1', 'us-2'],
    });
  });

  it('should update completed when a Realtime INSERT arrives for a batch ID', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });

    act(() => {
      realtimeCallback.current?.({
        new: { user_story_id: 'us-1', score_global: 72 },
        eventType: 'INSERT',
      });
    });

    expect(result.current.state.completed).toBe(1);
    expect(result.current.state.results.get('us-1')).toEqual({
      score: 72,
      status: 'success',
    });
  });

  it('should set done=true when all stories are analyzed', async () => {
    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 1 });
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1']); });

    act(() => {
      realtimeCallback.current?.({
        new: { user_story_id: 'us-1', score_global: 80 },
        eventType: 'INSERT',
      });
    });

    expect(result.current.state.done).toBe(true);
    expect(result.current.state.completed).toBe(1);
  });

  it('should ignore Realtime events for IDs not in the batch', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });

    act(() => {
      realtimeCallback.current?.({
        new: { user_story_id: 'us-other', score_global: 50 },
        eventType: 'INSERT',
      });
    });

    expect(result.current.state.completed).toBe(0);
    expect(result.current.state.results.has('us-other')).toBe(false);
  });

  it('should not mark done until all stories complete', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });

    act(() => {
      realtimeCallback.current?.({
        new: { user_story_id: 'us-1', score_global: 65 },
        eventType: 'INSERT',
      });
    });

    expect(result.current.state.done).toBe(false);
    expect(result.current.state.completed).toBe(1);
  });

  it('should subscribe to Realtime on startBatch', async () => {
    const { result } = renderHook(() => useBatchAnalysis());

    await act(async () => { await result.current.startBatch(['us-1']); });

    await waitFor(() => expect(realtimeCallback.current).not.toBeNull());
  });
});
