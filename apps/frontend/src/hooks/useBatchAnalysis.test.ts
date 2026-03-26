import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/api.js', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

import { api } from '../lib/api.js';
import { useBatchAnalysis, POLL_INTERVAL_MS } from './useBatchAnalysis.js';

const makeAnalysis = (scoreGlobal = 72) => ({
  id: 'analysis-1',
  scoreGlobal,
  createdAt: new Date().toISOString(),
});

// Avance les timers ET vide les microtasks (Vitest 2.x)
async function advancePoll() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 50);
  });
}

describe('useBatchAnalysis', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // reset implémentation ET historique
    vi.useFakeTimers();
    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 2 });
    vi.mocked(api.get).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('should poll GET /api/analyses?userStoryId= for each pending story', async () => {
    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });
    await advancePoll();

    expect(api.get).toHaveBeenCalledWith('/api/analyses?userStoryId=us-1');
    expect(api.get).toHaveBeenCalledWith('/api/analyses?userStoryId=us-2');
  });

  it('should mark a story as completed when the API returns an analysis', async () => {
    vi.mocked(api.get).mockResolvedValue(makeAnalysis(72));

    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });
    await advancePoll();

    expect(result.current.state.completed).toBe(2);
    expect(result.current.state.results.get('us-1')).toEqual({ score: 72, status: 'success' });
  });

  it('should set done=true when all stories are completed', async () => {
    vi.mocked(api.get).mockResolvedValue(makeAnalysis(80));
    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 1 });

    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1']); });
    await advancePoll();

    expect(result.current.state.done).toBe(true);
  });

  it('should not mark done while some stories are still pending', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(makeAnalysis(65)) // us-1 → done
      .mockResolvedValueOnce(null);            // us-2 → pas prête

    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 2 });

    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });
    await advancePoll();

    expect(result.current.state.completed).toBe(1);
    expect(result.current.state.done).toBe(false);
  });

  it('should pick up remaining stories on subsequent polls', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(makeAnalysis(65)) // us-1, poll 1
      .mockResolvedValueOnce(null)             // us-2, poll 1 — pas prête
      .mockResolvedValueOnce(makeAnalysis(50)) // us-2, poll 2 — prête

    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 2 });

    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1', 'us-2']); });

    await advancePoll(); // poll 1
    expect(result.current.state.completed).toBe(1);

    await advancePoll(); // poll 2
    expect(result.current.state.completed).toBe(2);
    expect(result.current.state.done).toBe(true);
  });

  it('should ignore API errors and retry on next poll', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('Network error')) // poll 1 — erreur
      .mockResolvedValueOnce(makeAnalysis(78));          // poll 2 — OK

    vi.mocked(api.post).mockResolvedValue({ batchId: 'batch-abc', total: 1 });

    const { result } = renderHook(() => useBatchAnalysis());
    await act(async () => { await result.current.startBatch(['us-1']); });

    await advancePoll(); // poll 1 échoue silencieusement
    expect(result.current.state.completed).toBe(0);

    await advancePoll(); // poll 2 réussit
    expect(result.current.state.done).toBe(true);
  });
});
