import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

export interface GenerationHistoryItem {
  id: string;
  analysisId: string | null;
  framework: string;
  language: string;
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  status: string;
  durationMs: number | null;
  createdAt: string;
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
}

export interface StoryGroupData {
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  generations: GenerationHistoryItem[];
}

export interface ConnectionGroupData {
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
  stories: StoryGroupData[];
  totalGenerations: number;
}

export function groupByTree(items: GenerationHistoryItem[]): ConnectionGroupData[] {
  const connMap = new Map<
    string,
    {
      connectionId: string | null;
      connectionName: string | null;
      connectionType: 'jira' | 'azure_devops' | null;
      storiesMap: Map<
        string,
        {
          userStoryId: string | null;
          userStoryTitle: string | null;
          userStoryExternalId: string | null;
          gens: GenerationHistoryItem[];
        }
      >;
    }
  >();

  for (const item of items) {
    const connKey = item.connectionId ?? '__orphan__';
    if (!connMap.has(connKey)) {
      connMap.set(connKey, {
        connectionId: item.connectionId,
        connectionName: item.connectionName,
        connectionType: item.connectionType,
        storiesMap: new Map(),
      });
    }
    const connEntry = connMap.get(connKey)!;

    const storyKey = item.userStoryId ?? '__no_us__';
    if (!connEntry.storiesMap.has(storyKey)) {
      connEntry.storiesMap.set(storyKey, {
        userStoryId: item.userStoryId,
        userStoryTitle: item.userStoryTitle,
        userStoryExternalId: item.userStoryExternalId,
        gens: [],
      });
    }
    connEntry.storiesMap.get(storyKey)!.gens.push(item);
  }

  const groups: ConnectionGroupData[] = [];

  for (const [, connEntry] of connMap) {
    const stories: StoryGroupData[] = [];
    for (const [, storyEntry] of connEntry.storiesMap) {
      stories.push({
        userStoryId: storyEntry.userStoryId,
        userStoryTitle: storyEntry.userStoryTitle,
        userStoryExternalId: storyEntry.userStoryExternalId,
        generations: storyEntry.gens, // already sorted desc by API
      });
    }

    // Sort stories by date of latest generation desc
    stories.sort((a, b) => {
      const aDate = a.generations[0]?.createdAt ?? '';
      const bDate = b.generations[0]?.createdAt ?? '';
      return bDate.localeCompare(aDate);
    });

    groups.push({
      connectionId: connEntry.connectionId,
      connectionName: connEntry.connectionName,
      connectionType: connEntry.connectionType,
      stories,
      totalGenerations: stories.reduce((sum, s) => sum + s.generations.length, 0),
    });
  }

  // Sort: alphabetical by name, orphan (null) last
  groups.sort((a, b) => {
    if (a.connectionId === null && b.connectionId !== null) return 1;
    if (a.connectionId !== null && b.connectionId === null) return -1;
    return (a.connectionName ?? '').localeCompare(b.connectionName ?? '');
  });

  return groups;
}

export function useHistoryData(connectionId: string | null): {
  groups: ConnectionGroupData[];
  totalGenerations: number;
  loading: boolean;
} {
  const [groups, setGroups] = useState<ConnectionGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : '';
    api
      .get<GenerationHistoryItem[]>(`/api/generations/history${params}`)
      .then((items) => setGroups(groupByTree(items)))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [connectionId]);

  const totalGenerations = groups.reduce((sum, g) => sum + g.totalGenerations, 0);

  return { groups, totalGenerations, loading };
}
