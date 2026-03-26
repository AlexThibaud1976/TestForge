import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XrayConnector } from './XrayConnector.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const credentials = { clientId: 'client-id', clientSecret: 'client-secret' };

function mockFetchJson(body: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('XrayConnector', () => {
  let connector: XrayConnector;

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new XrayConnector(credentials);
  });

  describe('authenticate()', () => {
    it('returns a JWT token on success', async () => {
      mockFetchJson('xray-jwt-token-abc123');
      const token = await connector.authenticate();
      expect(token).toBe('xray-jwt-token-abc123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/authenticate'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('caches the token and does not re-authenticate within TTL', async () => {
      mockFetchJson('xray-jwt-token-abc123');
      await connector.authenticate();
      const token2 = await connector.authenticate();
      expect(token2).toBe('xray-jwt-token-abc123');
      expect(mockFetch).toHaveBeenCalledTimes(1); // only one auth call
    });

    it('throws when authentication fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
      await expect(connector.authenticate()).rejects.toThrow('Xray authentication failed');
    });
  });

  describe('mapStepsFromAC()', () => {
    it('parses Given/When/Then format into steps', () => {
      const ac = 'Given a logged in user\nWhen they click submit\nThen they see success';
      const steps = connector.mapStepsFromAC(ac);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('action');
      expect(steps[0]).toHaveProperty('result');
    });

    it('handles plain acceptance criteria lines', () => {
      const ac = 'User can log in\nUser sees dashboard\nUser can log out';
      const steps = connector.mapStepsFromAC(ac);
      expect(steps).toHaveLength(3);
      expect(steps[0]!.action).toBe('User can log in');
    });

    it('ignores empty lines and comment lines', () => {
      const ac = '\n# Acceptance Criteria\nUser can log in\n\nUser sees dashboard\n';
      const steps = connector.mapStepsFromAC(ac);
      expect(steps).toHaveLength(2);
    });
  });

  describe('createTest()', () => {
    beforeEach(() => {
      // Auth call
      mockFetchJson('xray-token');
    });

    it('creates a test and returns testId + testKey', async () => {
      // createTest call
      mockFetchJson({ id: '456', key: 'PROJ-123' });

      const result = await connector.createTest({
        projectKey: 'PROJ',
        summary: '[TestForge] Login',
        steps: [{ action: 'Click login', result: 'Dashboard shown' }],
      });

      expect(result.testId).toBe('456');
      expect(result.testKey).toBe('PROJ-123');
    });

    it('links to requirement when requirementKey is provided', async () => {
      mockFetchJson({ id: '789', key: 'PROJ-124' });
      // Link call
      mockFetchJson({});

      await connector.createTest({
        projectKey: 'PROJ',
        summary: '[TestForge] Feature',
        steps: [{ action: 'Do something', result: 'Result shown' }],
        requirementKey: 'PROJ-10',
      });

      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + create + link
    });

    it('throws when test creation fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve('Bad Request') });
      await expect(
        connector.createTest({ projectKey: 'PROJ', summary: 'Test', steps: [] }),
      ).rejects.toThrow('Xray test creation failed');
    });

    it('handles a non-array (single object) response from /import/test', async () => {
      mockFetchJson({ id: '200', key: 'PROJ-200' }); // Xray returns a single object
      const result = await connector.createTest({ projectKey: 'PROJ', summary: 'Test', steps: [] });
      expect(result.testId).toBe('200');
      expect(result.testKey).toBe('PROJ-200');
    });

    it('throws when Xray returns an empty array', async () => {
      mockFetchJson([]); // no test created in response
      await expect(
        connector.createTest({ projectKey: 'PROJ', summary: 'Test', steps: [] }),
      ).rejects.toThrow('Xray: no test created in response');
    });
  });

  describe('createTest() with Jira credentials', () => {
    beforeEach(() => {
      mockFetchJson('xray-token'); // auth
    });

    it('creates a test via Jira API and returns testId + testKey', async () => {
      mockFetchJson({ projects: [{ issuetypes: [{ name: 'Test' }, { name: 'Bug' }] }] }); // createmeta
      mockFetchJson({ id: '101', key: 'PROJ-101' }); // Jira issue create
      mockFetchJson({}); // step add (non-blocking)

      const result = await connector.createTest({
        projectKey: 'PROJ',
        summary: '[TestForge] Feature',
        steps: [{ action: 'Click button', result: 'Success' }],
        jiraBaseUrl: 'https://my.jira.com',
        jiraAuthHeader: 'Basic abc123',
      });

      expect(result.testId).toBe('101');
      expect(result.testKey).toBe('PROJ-101');
    });

    it('throws when Jira issue creation fails', async () => {
      mockFetchJson({ projects: [{ issuetypes: [{ name: 'Test' }] }] }); // createmeta
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve('Bad Request') });

      await expect(connector.createTest({
        projectKey: 'PROJ',
        summary: 'Test',
        steps: [],
        jiraBaseUrl: 'https://my.jira.com',
        jiraAuthHeader: 'Basic abc123',
      })).rejects.toThrow('Jira Test issue creation failed');
    });

    it('selects "Xray Test" issue type when it is available', async () => {
      mockFetchJson({ projects: [{ issuetypes: [{ name: 'Xray Test' }, { name: 'Bug' }] }] });
      mockFetchJson({ id: '102', key: 'PROJ-102' });

      await connector.createTest({
        projectKey: 'PROJ', summary: 'Test', steps: [],
        jiraBaseUrl: 'https://my.jira.com', jiraAuthHeader: 'Basic abc123',
      });

      // Third fetch call is the Jira issue creation; check the issuetype used
      const createBody = JSON.parse(mockFetch.mock.calls[2]![1].body as string) as { fields: { issuetype: { name: string } } };
      expect(createBody.fields.issuetype.name).toBe('Xray Test');
    });

    it('falls back to "Test" type when createmeta API is not accessible', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve('Forbidden') });
      mockFetchJson({ id: '103', key: 'PROJ-103' }); // Jira create with fallback type

      const result = await connector.createTest({
        projectKey: 'PROJ', summary: 'Test', steps: [],
        jiraBaseUrl: 'https://my.jira.com', jiraAuthHeader: 'Basic abc123',
      });
      expect(result.testKey).toBe('PROJ-103');
    });

    it('falls back to "Test" type when no issue type matches "test"', async () => {
      mockFetchJson({ projects: [{ issuetypes: [{ name: 'Bug' }, { name: 'Story' }] }] });
      mockFetchJson({ id: '104', key: 'PROJ-104' });

      const result = await connector.createTest({
        projectKey: 'PROJ', summary: 'Test', steps: [],
        jiraBaseUrl: 'https://my.jira.com', jiraAuthHeader: 'Basic abc123',
      });
      expect(result.testKey).toBe('PROJ-104');
      const createBody = JSON.parse(mockFetch.mock.calls[2]![1].body as string) as { fields: { issuetype: { name: string } } };
      expect(createBody.fields.issuetype.name).toBe('Test');
    });
  });

  describe('updateTestSteps()', () => {
    beforeEach(() => {
      mockFetchJson('xray-token'); // auth
    });

    it('sends a PUT request with indexed steps', async () => {
      mockFetchJson({}, true, 200); // PUT response

      await connector.updateTestSteps('PROJ-100', [
        { action: 'Click login', result: 'Dashboard shown' },
      ]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [url, opts] = mockFetch.mock.calls[1]!;
      expect(url).toContain('/test/PROJ-100/step');
      expect(opts.method).toBe('PUT');
      const body = JSON.parse(opts.body as string) as Array<{ index: number; action: string }>;
      expect(body[0]!.index).toBe(1);
      expect(body[0]!.action).toBe('Click login');
    });

    it('throws when the PUT request fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('Server Error') });
      await expect(connector.updateTestSteps('PROJ-100', [])).rejects.toThrow('Xray updateTestSteps failed');
    });
  });
});
