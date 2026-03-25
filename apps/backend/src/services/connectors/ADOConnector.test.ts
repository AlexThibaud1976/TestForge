import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ADOConnector } from './ADOConnector.js';

const creds = {
  organizationUrl: 'https://dev.azure.com/myorg',
  project: 'MyProject',
  pat: 'my-pat-token',
};

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

describe('ADOConnector', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('testConnection', () => {
    it('resolves when work item types endpoint returns 200', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ value: [] }));
      const connector = new ADOConnector(creds);
      await expect(connector.testConnection()).resolves.toBeUndefined();
    });

    it('throws on 401 (invalid PAT)', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ message: 'Unauthorized' }, 401));
      const connector = new ADOConnector(creds);
      await expect(connector.testConnection()).rejects.toThrow('401');
    });

    it('sends Basic Auth header with PAT', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}));
      const connector = new ADOConnector(creds);
      await connector.testConnection().catch(() => {});
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)['Authorization']).toMatch(/^Basic /);
    });
  });

  describe('listProjects', () => {
    it('returns project list', async () => {
      mockFetch.mockReturnValueOnce(
        mockResponse({ value: [{ id: 'abc', name: 'MyProject' }] }),
      );
      const connector = new ADOConnector(creds);
      const projects = await connector.listProjects();
      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('MyProject');
    });
  });

  describe('fetchUserStories', () => {
    it('returns empty array when WIQL returns no items', async () => {
      // WIQL POST
      mockFetch.mockReturnValueOnce(mockResponse({ workItems: [] }));
      const connector = new ADOConnector(creds);
      const stories = await connector.fetchUserStories('t', 'c');
      expect(stories).toHaveLength(0);
    });

    it('maps ADO work items to UserStory shape', async () => {
      // WIQL POST
      mockFetch.mockReturnValueOnce(mockResponse({ workItems: [{ id: 42, url: '...' }] }));
      // Batch GET
      mockFetch.mockReturnValueOnce(
        mockResponse({
          value: [{
            id: 42,
            fields: {
              'System.Title': 'Connexion utilisateur',
              'System.Description': '<p>En tant que...</p>',
              'Microsoft.VSTS.Common.AcceptanceCriteria': '<ul><li>Doit fonctionner</li></ul>',
              'System.State': 'Active',
              'System.Tags': 'auth; v1',
            },
          }],
        }),
      );

      const connector = new ADOConnector(creds);
      const stories = await connector.fetchUserStories('team-1', 'conn-1');

      expect(stories).toHaveLength(1);
      expect(stories[0]).toMatchObject({
        externalId: '42',
        title: 'Connexion utilisateur',
        description: 'En tant que...',
        acceptanceCriteria: 'Doit fonctionner',
        status: 'Active',
        labels: ['auth', 'v1'],
      });
    });

    it('strips HTML tags from description and acceptance criteria', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ workItems: [{ id: 1, url: '' }] }));
      mockFetch.mockReturnValueOnce(
        mockResponse({
          value: [{
            id: 1,
            fields: {
              'System.Title': 'Test',
              'System.Description': '<p><strong>Bold</strong> text</p>',
              'Microsoft.VSTS.Common.AcceptanceCriteria': null,
              'System.State': 'New',
              'System.Tags': null,
            },
          }],
        }),
      );

      const connector = new ADOConnector(creds);
      const stories = await connector.fetchUserStories('t', 'c');
      expect(stories[0]?.description).toBe('Bold text');
      expect(stories[0]?.acceptanceCriteria).toBe('');
    });
  });

  // V2 — writeback + test plans
  describe('updateWorkItem (V2)', () => {
    it('sends PATCH request with JSON Patch for description', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}));
      const connector = new ADOConnector(creds);
      await connector.updateWorkItem(42, { description: 'New description' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/workitems/42'),
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('throws on API error during writeback', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}, false));
      const connector = new ADOConnector(creds);
      await expect(connector.updateWorkItem(42, { description: 'New' })).rejects.toThrow('ADO updateWorkItem error');
    });
  });

  describe('createTestCase (V2)', () => {
    it('creates a Test Case work item and returns its ID', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({ id: 1234 }));
      const connector = new ADOConnector(creds);
      const id = await connector.createTestCase('Login Test', [
        { action: 'Click login button', expectedResult: 'User is redirected' },
      ]);
      expect(id).toBe(1234);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('$Test%20Case'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on API error when creating test case', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}, false));
      const connector = new ADOConnector(creds);
      await expect(connector.createTestCase('Test', [])).rejects.toThrow('ADO createTestCase error');
    });
  });

  describe('addTestCaseToSuite (V2)', () => {
    it('calls the suite API to add test case', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}));
      const connector = new ADOConnector(creds);
      await connector.addTestCaseToSuite(10, 20, 1234);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans/10/suites/20/testcases/1234'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on API error', async () => {
      mockFetch.mockReturnValueOnce(mockResponse({}, false));
      const connector = new ADOConnector(creds);
      await expect(connector.addTestCaseToSuite(10, 20, 1234)).rejects.toThrow('ADO addTestCaseToSuite error');
    });
  });
});
