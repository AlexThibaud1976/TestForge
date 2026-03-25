import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureReposAdapter } from './AzureReposAdapter.js';

// Mock azure-devops-node-api
const mockGitApi = {
  getRepository: vi.fn(),
  getRefs: vi.fn(),
  createPush: vi.fn(),
  createPullRequest: vi.fn(),
};

vi.mock('azure-devops-node-api', () => ({
  default: {
    getPersonalAccessTokenHandler: vi.fn().mockReturnValue({}),
  },
  getPersonalAccessTokenHandler: vi.fn().mockReturnValue({}),
  WebApi: vi.fn().mockImplementation(() => ({
    getGitApi: vi.fn().mockResolvedValue(mockGitApi),
  })),
}));

const repoUrl = 'https://dev.azure.com/myorg/MyProject/_git/my-repo';
const token = 'ado-pat-token';

const files = [
  { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
];

describe('AzureReposAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGitApi.getRepository.mockResolvedValue({ id: 'repo-id', name: 'my-repo', defaultBranch: 'refs/heads/main' });
    mockGitApi.getRefs.mockResolvedValue([{ objectId: 'base-sha' }]);
    mockGitApi.createPush.mockResolvedValue({ commits: [{ commitId: 'commit-sha' }] });
    mockGitApi.createPullRequest.mockResolvedValue({ pullRequestId: 7, url: 'https://dev.azure.com/...' });
  });

  describe('constructor', () => {
    it('throws for invalid Azure Repos URL', () => {
      expect(() => new AzureReposAdapter(token, 'https://github.com/org/repo')).toThrow('Invalid Azure Repos URL');
    });
  });

  describe('testConnection()', () => {
    it('returns repo name and default branch', async () => {
      const adapter = new AzureReposAdapter(token, repoUrl);
      const result = await adapter.testConnection();
      expect(result.ok).toBe(true);
      expect(result.repoName).toBe('my-repo');
      expect(result.defaultBranch).toBe('main');
    });
  });

  describe('pushFiles() — commit mode', () => {
    it('returns branchName and commitSha without prUrl', async () => {
      const adapter = new AzureReposAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'commit');
      expect(result.branchName).toBe('testforge/US-42');
      expect(result.commitSha).toBe('commit-sha');
      expect(result.prUrl).toBeUndefined();
    });

    it('calls createPush with correct branch name', async () => {
      const adapter = new AzureReposAdapter(token, repoUrl);
      await adapter.pushFiles(files, 'testforge/US-42', 'main', 'commit');
      expect(mockGitApi.createPush).toHaveBeenCalledWith(
        expect.objectContaining({
          refUpdates: expect.arrayContaining([
            expect.objectContaining({ name: 'refs/heads/testforge/US-42' }),
          ]),
        }),
        'repo-id',
        'MyProject',
      );
    });
  });

  describe('pushFiles() — pr mode', () => {
    it('returns prUrl including pull request ID', async () => {
      const adapter = new AzureReposAdapter(token, repoUrl);
      const result = await adapter.pushFiles(files, 'testforge/US-42', 'main', 'pr');
      expect(result.prUrl).toContain('pullrequest/7');
    });

    it('calls createPullRequest with TestForge prefix in title', async () => {
      const adapter = new AzureReposAdapter(token, repoUrl);
      await adapter.pushFiles(files, 'testforge/US-42-login', 'main', 'pr');
      expect(mockGitApi.createPullRequest).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining('[TestForge]') }),
        'repo-id',
        'MyProject',
      );
    });

    it('throws when base branch ref not found', async () => {
      mockGitApi.getRefs.mockResolvedValue([]); // no refs
      const adapter = new AzureReposAdapter(token, repoUrl);
      await expect(adapter.pushFiles(files, 'testforge/US-42', 'main', 'pr')).rejects.toThrow("not found");
    });
  });
});
