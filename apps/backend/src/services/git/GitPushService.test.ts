import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitPushService } from './GitPushService.js';

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

vi.mock('./GitHubAdapter.js', () => ({
  GitHubAdapter: vi.fn().mockImplementation(() => ({
    pushFiles: vi.fn().mockResolvedValue({ branchName: 'testforge/US-42-login', commitSha: 'abc123', prUrl: 'https://github.com/org/repo/pull/1' }),
  })),
}));

vi.mock('./GitLabAdapter.js', () => ({
  GitLabAdapter: vi.fn().mockImplementation(() => ({
    pushFiles: vi.fn().mockResolvedValue({ branchName: 'testforge/US-42-login', commitSha: 'def456' }),
  })),
}));

vi.mock('./AzureReposAdapter.js', () => ({
  AzureReposAdapter: vi.fn().mockImplementation(() => ({
    pushFiles: vi.fn().mockResolvedValue({ branchName: 'testforge/US-42-login', commitSha: 'ghi789' }),
  })),
}));

const mockGitConfig = {
  id: 'gc-1',
  teamId: 't-1',
  provider: 'github',
  repoUrl: 'https://github.com/org/repo',
  encryptedToken: 'ghp_test',
  defaultBranch: 'main',
};

const mockGeneration = {
  id: 'gen-1',
  teamId: 't-1',
  analysisId: 'a-1',
  framework: 'playwright',
  language: 'typescript',
  status: 'success',
};

const mockFiles = [
  { id: 'f-1', generationId: 'gen-1', fileType: 'page_object', filename: 'pages/Login.page.ts', content: 'export class LoginPage {}', createdAt: new Date() },
  { id: 'f-2', generationId: 'gen-1', fileType: 'test_spec', filename: 'tests/login.spec.ts', content: 'import { test }', createdAt: new Date() },
];

const mockAnalysis = { id: 'a-1', userStoryId: 's-1' };
const mockStory = { id: 's-1', externalId: 'US-42', title: 'Login feature' };

describe('GitPushService', () => {
  let service: GitPushService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  const setupDbMocks = (provider = 'github') => {
    const config = { ...mockGitConfig, provider };
    // Each call to db.select() returns the next item from this sequence
    const selectSequence = [
      [config],         // call 0: gitConfigs (config check)
      [mockGeneration], // call 1: generations
      mockFiles,        // call 2: generatedFiles (no destructuring — direct array)
      [mockAnalysis],   // call 3: analyses (for buildBranchName)
      [mockStory],      // call 4: userStories (for buildBranchName)
    ];
    let selectCallCount = 0;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => {
      const idx = selectCallCount++;
      const response = selectSequence[idx] ?? [];
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(response),
      };
    });

    const mockReturning = vi.fn().mockResolvedValue([{
      id: 'push-1', generationId: 'gen-1', teamId: 't-1', mode: 'pr',
      branchName: 'testforge/US-42-login', commitSha: null, prUrl: null, status: 'pending',
    }]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

    const updateReturning = vi.fn().mockResolvedValue([{
      id: 'push-1', mode: 'pr', branchName: 'testforge/US-42-login',
      commitSha: 'abc123', prUrl: 'https://github.com/org/repo/pull/1', status: 'success',
    }]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue({ returning: updateReturning }),
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new GitPushService();
    mockDb = (await import('../../db/index.js')).db;
  });

  it('uses GitHubAdapter for github provider', async () => {
    setupDbMocks('github');
    const { GitHubAdapter } = await import('./GitHubAdapter.js');

    const result = await service.push({ generationId: 'gen-1', teamId: 't-1', gitConfigId: 'gc-1', mode: 'pr' });
    expect(result.status).toBe('success');
    expect(GitHubAdapter).toHaveBeenCalled();
  });

  it('uses GitLabAdapter for gitlab provider', async () => {
    setupDbMocks('gitlab');
    const { GitLabAdapter } = await import('./GitLabAdapter.js');

    await service.push({ generationId: 'gen-1', teamId: 't-1', gitConfigId: 'gc-1', mode: 'commit' });
    expect(GitLabAdapter).toHaveBeenCalled();
  });

  it('uses AzureReposAdapter for azure_repos provider', async () => {
    setupDbMocks('azure_repos');
    const { AzureReposAdapter } = await import('./AzureReposAdapter.js');

    await service.push({ generationId: 'gen-1', teamId: 't-1', gitConfigId: 'gc-1', mode: 'commit' });
    expect(AzureReposAdapter).toHaveBeenCalled();
  });

  it('throws for unknown provider', async () => {
    // Only need the first two selects to reach the adapter creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unknownConfig = { ...mockGitConfig, provider: 'unknown-provider' };
    let selectCallCount = 0;
    const selectSequence = [[unknownConfig], [mockGeneration], mockFiles, [mockAnalysis], [mockStory]];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => {
      const response = selectSequence[selectCallCount++] ?? [];
      return { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(response) };
    });
    const mockReturning = vi.fn().mockResolvedValue([{ id: 'push-1', status: 'pending' }]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

    await expect(
      service.push({ generationId: 'gen-1', teamId: 't-1', gitConfigId: 'gc-1', mode: 'pr' }),
    ).rejects.toThrow('Unsupported Git provider');
  });

  it('throws when git config belongs to different team', async () => {
    let selectCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(selectCallCount++ === 0 ? [{ ...mockGitConfig, teamId: 'other-team' }] : []),
    }));

    await expect(
      service.push({ generationId: 'gen-1', teamId: 't-1', gitConfigId: 'gc-1', mode: 'pr' }),
    ).rejects.toThrow('Git config not found');
  });
});
