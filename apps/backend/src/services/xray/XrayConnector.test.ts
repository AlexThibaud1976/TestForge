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
  });
});
