import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitLabAdapter } from './GitLabAdapter.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const repoUrl = 'https://gitlab.com/org/test-repo';
const token = 'glpat-test-token';

const files = [
  { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
];

function mockFetchJson(body: unknown, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('GitLabAdapter', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('testConnection()', () => {
    it('returns repo name and default branch', async () => {
      mockFetchJson({ name_with_namespace: 'org / test-repo', default_branch: 'main' });
      const adapter = new GitLabAdapter(token, repoUrl);
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.repoName).toBe('org / test-repo');
      expect(result.defaultBranch).toBe('main');
    });

    it('throws for invalid GitLab URL', () => {
      expect(() => new GitLabAdapter(token, 'not-a-url')).toThrow('Invalid GitLab repo URL');
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') });
      const adapter = new GitLabAdapter(token, repoUrl);
      await expect(adapter.testConnection()).rejects.toThrow('GitLab API error 401');
    });
  });

  describe('pushFiles() — commit mode', () => {
    it('returns branchName and commitSha without prUrl', async () => {
      mockFetchJson({ id: 'abc123' });
      const adapter = new GitLabAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'commit');
      expect(result.branchName).toBe('testforge/US-42');
      expect(result.commitSha).toBe('abc123');
      expect(result.prUrl).toBeUndefined();
    });

    it('sends all files as actions in single commit', async () => {
      mockFetchJson({ id: 'sha' });
      const multiFiles = [
        { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'class A {}' },
        { type: 'test_spec' as const, filename: 'tests/login.spec.ts', content: 'test()' },
        { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{}' },
      ];
      const adapter = new GitLabAdapter(token, repoUrl);
      await adapter.pushFiles(multiFiles, 'testforge/US-42', 'main', 'commit');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repository/commits'),
        expect.objectContaining({
          body: expect.stringContaining('"actions"'),
        }),
      );
    });
  });

  describe('pushFiles() — pr mode', () => {
    it('returns prUrl from merge request', async () => {
      mockFetchJson({ id: 'sha' }); // commit
      mockFetchJson({ web_url: 'https://gitlab.com/org/repo/-/merge_requests/5' }); // MR
      const adapter = new GitLabAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'pr');
      expect(result.prUrl).toBe('https://gitlab.com/org/repo/-/merge_requests/5');
    });
  });
});
