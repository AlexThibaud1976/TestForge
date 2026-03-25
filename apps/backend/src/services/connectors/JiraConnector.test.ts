import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraConnector } from './JiraConnector.js';

const creds = {
  baseUrl: 'https://acme.atlassian.net',
  email: 'test@acme.com',
  apiToken: 'my-token',
  projectKey: 'ACME',
};

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('JiraConnector', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('testConnection', () => {
    it('resolves when /myself returns 200', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ accountId: '123' }));
      const connector = new JiraConnector(creds);
      await expect(connector.testConnection()).resolves.toBeUndefined();
    });

    it('throws on 401', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ message: 'Unauthorized' }, 401));
      const connector = new JiraConnector(creds);
      await expect(connector.testConnection()).rejects.toThrow('401');
    });

    it('sends Basic Auth header', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}));
      const connector = new JiraConnector(creds);
      await connector.testConnection().catch(() => {});
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)['Authorization']).toMatch(/^Basic /);
    });
  });

  describe('listProjects', () => {
    it('returns project list', async () => {
      mockFetch.mockReturnValueOnce(
        mockResponse({ values: [{ key: 'ACME', name: 'Acme Project', id: '10001' }] }),
      );
      const connector = new JiraConnector(creds);
      const projects = await connector.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0]?.key).toBe('ACME');
    });
  });

  describe('fetchUserStories', () => {
    it('maps Jira issues to UserStory shape', async () => {
      const jiraIssue = {
        id: '10042',
        key: 'ACME-42',
        fields: {
          summary: 'Connexion utilisateur',
          description: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'En tant que...' }] }],
          },
          status: { name: 'To Do' },
          labels: ['auth', 'v1'],
          assignee: { displayName: 'Sarah' },
        },
      };
      mockFetch.mockReturnValueOnce(
        mockResponse({ issues: [jiraIssue], total: 1, startAt: 0 }),
      );

      const connector = new JiraConnector(creds);
      const stories = await connector.fetchUserStories('team-1', 'conn-1');

      expect(stories).toHaveLength(1);
      expect(stories[0]).toMatchObject({
        externalId: 'ACME-42',
        title: 'Connexion utilisateur',
        description: 'En tant que...',
        status: 'To Do',
        labels: ['auth', 'v1'],
        teamId: 'team-1',
        connectionId: 'conn-1',
      });
    });

    it('handles null description gracefully', async () => {
      mockFetch.mockReturnValueOnce(
        mockResponse({
          issues: [{ id: '1', key: 'ACME-1', fields: { summary: 'Test', description: null, status: null, labels: [] } }],
          total: 1,
          startAt: 0,
        }),
      );
      const connector = new JiraConnector(creds);
      const stories = await connector.fetchUserStories('t', 'c');
      expect(stories[0]?.description).toBe('');
      expect(stories[0]?.status).toBe('');
    });
  });

  // V2 — writeback
  describe('updateStory (V2)', () => {
    it('sends PUT request to update description', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}, 204));
      const connector = new JiraConnector(creds);
      await connector.updateStory('ACME-42', { description: 'New description' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/issue/ACME-42'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('throws on API error during writeback', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ error: 'Forbidden' }, 403));
      const connector = new JiraConnector(creds);
      await expect(connector.updateStory('ACME-42', { description: 'New' })).rejects.toThrow('403');
    });

    it('includes both description and acceptanceCriteria when both provided', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}, 204));
      const connector = new JiraConnector(creds);
      await connector.updateStory('ACME-42', {
        description: 'New description',
        acceptanceCriteria: 'User can do X',
      });
      const body = JSON.parse(mockFetch.mock.calls[0]?.[1]?.body as string) as { fields: { description?: unknown } };
      expect(body.fields.description).toBeDefined();
    });
  });
});
