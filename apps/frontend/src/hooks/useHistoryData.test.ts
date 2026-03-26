import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/api.js', () => ({
  api: { get: vi.fn() },
}));

import { api } from '../lib/api.js';
import { useHistoryData, groupByTree, type GenerationHistoryItem } from './useHistoryData.js';

const makeItem = (overrides: Partial<GenerationHistoryItem> = {}): GenerationHistoryItem => ({
  id: 'gen-1',
  analysisId: 'analysis-1',
  framework: 'playwright',
  language: 'typescript',
  usedImprovedVersion: false,
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  status: 'success',
  durationMs: 1200,
  createdAt: '2024-01-15T10:00:00Z',
  userStoryId: 'us-1',
  userStoryTitle: 'Login',
  userStoryExternalId: 'PROJ-1',
  connectionId: 'conn-1',
  connectionName: 'Backend',
  connectionType: 'jira',
  ...overrides,
});

describe('groupByTree', () => {
  it('should group items by connectionId and userStoryId', () => {
    const items = [
      makeItem({ id: 'g1', connectionId: 'conn-1', userStoryId: 'us-1' }),
      makeItem({ id: 'g2', connectionId: 'conn-1', userStoryId: 'us-1' }),
      makeItem({ id: 'g3', connectionId: 'conn-2', connectionName: 'ADO', connectionType: 'azure_devops', userStoryId: 'us-2', userStoryTitle: 'Register', userStoryExternalId: 'ADO-1' }),
    ];

    const groups = groupByTree(items);

    expect(groups).toHaveLength(2);
    const backendGroup = groups.find((g) => g.connectionId === 'conn-1');
    expect(backendGroup!.stories[0]!.generations).toHaveLength(2);
  });

  it('should calculate totalGenerations per connection', () => {
    const items = [
      makeItem({ id: 'g1', connectionId: 'conn-1', userStoryId: 'us-1' }),
      makeItem({ id: 'g2', connectionId: 'conn-1', userStoryId: 'us-2', userStoryTitle: 'Register', userStoryExternalId: 'PROJ-2' }),
      makeItem({ id: 'g3', connectionId: 'conn-1', userStoryId: 'us-2', userStoryTitle: 'Register', userStoryExternalId: 'PROJ-2' }),
    ];

    const groups = groupByTree(items);
    expect(groups[0]!.totalGenerations).toBe(3);
  });

  it('should place orphan generations (null connectionId) in a null-connectionId group', () => {
    const items = [
      makeItem({ id: 'g1', userStoryId: null, userStoryTitle: null, userStoryExternalId: null, connectionId: null, connectionName: null, connectionType: null }),
    ];

    const groups = groupByTree(items);
    expect(groups[0]!.connectionId).toBeNull();
    expect(groups[0]!.stories[0]!.userStoryId).toBeNull();
  });

  it('should sort connections alphabetically with orphan last', () => {
    const items = [
      makeItem({ id: 'g1', connectionId: null, connectionName: null, connectionType: null }),
      makeItem({ id: 'g2', connectionId: 'conn-z', connectionName: 'Zulu', userStoryId: 'us-z' }),
      makeItem({ id: 'g3', connectionId: 'conn-a', connectionName: 'Alpha', connectionType: 'azure_devops', userStoryId: 'us-a' }),
    ];

    const groups = groupByTree(items);
    expect(groups[0]!.connectionName).toBe('Alpha');
    expect(groups[1]!.connectionName).toBe('Zulu');
    expect(groups[2]!.connectionId).toBeNull();
  });

  it('should return empty array for empty input', () => {
    expect(groupByTree([])).toEqual([]);
  });
});

describe('useHistoryData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue([]);
  });

  it('should return loading true initially', () => {
    const { result } = renderHook(() => useHistoryData(null));
    expect(result.current.loading).toBe(true);
  });

  it('should fetch from /api/generations/history', async () => {
    const { result } = renderHook(() => useHistoryData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/api/generations/history');
  });

  it('should include connectionId param in API call when provided', async () => {
    const { result } = renderHook(() => useHistoryData('conn-123'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.get).toHaveBeenCalledWith('/api/generations/history?connectionId=conn-123');
  });

  it('should return grouped data with totalGenerations', async () => {
    const items = [
      makeItem({ id: 'g1', connectionId: 'conn-1', userStoryId: 'us-1' }),
      makeItem({ id: 'g2', connectionId: 'conn-1', userStoryId: 'us-1' }),
    ];
    vi.mocked(api.get).mockResolvedValue(items);

    const { result } = renderHook(() => useHistoryData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.totalGenerations).toBe(2);
  });

  it('should return empty groups on API error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useHistoryData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.groups).toEqual([]);
    expect(result.current.totalGenerations).toBe(0);
  });
});
