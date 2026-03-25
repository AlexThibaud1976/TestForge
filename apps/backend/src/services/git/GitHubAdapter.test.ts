import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubAdapter } from './GitHubAdapter.js';

// Mock @octokit/rest
vi.mock('@octokit/rest', () => {
  const mockOctokit = {
    repos: { get: vi.fn() },
    git: {
      getRef: vi.fn(),
      getCommit: vi.fn(),
      createBlob: vi.fn(),
      createTree: vi.fn(),
      createCommit: vi.fn(),
      createRef: vi.fn(),
    },
    pulls: { create: vi.fn() },
  };
  return { Octokit: vi.fn().mockImplementation(() => mockOctokit), __mock: mockOctokit };
});

const repoUrl = 'https://github.com/org/test-repo';
const token = 'ghp_test_token';

const files = [
  { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
  { type: 'test_spec' as const, filename: 'tests/login.spec.ts', content: 'test("login", () => {})' },
];

describe('GitHubAdapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@octokit/rest');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mock = (mod as any).__mock;
  });

  describe('testConnection()', () => {
    it('returns repo name and default branch', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.repos.get.mockResolvedValue({ data: { full_name: 'org/test-repo', default_branch: 'main' } });
      const adapter = new GitHubAdapter(token, repoUrl);
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.repoName).toBe('org/test-repo');
      expect(result.defaultBranch).toBe('main');
    });

    it('throws for invalid GitHub URL', () => {
      expect(() => new GitHubAdapter(token, 'https://not-github.com/invalid')).toThrow('Invalid GitHub repo URL');
    });
  });

  describe('pushFiles() — commit mode', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.getRef.mockResolvedValue({ data: { object: { sha: 'base-sha' } } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.getCommit.mockResolvedValue({ data: { tree: { sha: 'tree-sha' } } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createBlob.mockResolvedValue({ data: { sha: 'blob-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createTree.mockResolvedValue({ data: { sha: 'new-tree-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createCommit.mockResolvedValue({ data: { sha: 'commit-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createRef.mockResolvedValue({ data: {} });
    });

    it('returns branchName and commitSha in commit mode', async () => {
      const adapter = new GitHubAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'commit');
      expect(result.branchName).toBe('testforge/US-42');
      expect(result.commitSha).toBe('commit-sha');
      expect(result.prUrl).toBeUndefined();
    });

    it('creates blobs for each file', async () => {
      const adapter = new GitHubAdapter(token, repoUrl);
      await adapter.pushFiles(files, 'testforge/US-42', 'main', 'commit');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mock.git.createBlob).toHaveBeenCalledTimes(files.length);
    });
  });

  describe('pushFiles() — pr mode', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.getRef.mockResolvedValue({ data: { object: { sha: 'base-sha' } } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.getCommit.mockResolvedValue({ data: { tree: { sha: 'tree-sha' } } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createBlob.mockResolvedValue({ data: { sha: 'blob-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createTree.mockResolvedValue({ data: { sha: 'new-tree-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createCommit.mockResolvedValue({ data: { sha: 'commit-sha' } });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.git.createRef.mockResolvedValue({ data: {} });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mock.pulls.create.mockResolvedValue({ data: { html_url: 'https://github.com/org/repo/pull/1' } });
    });

    it('returns prUrl in pr mode', async () => {
      const adapter = new GitHubAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'pr');
      expect(result.prUrl).toBe('https://github.com/org/repo/pull/1');
      expect(result.commitSha).toBe('commit-sha');
    });

    it('creates a PR with TestForge prefix in title', async () => {
      const adapter = new GitHubAdapter(token, repoUrl);
      await adapter.pushFiles(files, 'testforge/US-42-login', 'main', 'pr');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mock.pulls.create).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringContaining('[TestForge]'),
      }));
    });
  });
});
