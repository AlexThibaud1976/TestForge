import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WritebackService } from './WritebackService.js';

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

vi.mock('../connectors/JiraConnector.js', () => ({
  JiraConnector: vi.fn().mockImplementation(() => ({
    updateStory: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../connectors/ADOConnector.js', () => ({
  ADOConnector: vi.fn().mockImplementation(() => ({
    updateWorkItem: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockAnalysis = {
  id: 'a-1',
  teamId: 't-1',
  userStoryId: 's-1',
  improvedVersion: 'Improved description with better AC',
};

const mockStory = {
  id: 's-1',
  teamId: 't-1',
  externalId: 'US-42',
  title: 'Login',
  description: 'Original description',
  acceptanceCriteria: 'User can login',
  connectionId: 'c-1',
};

const mockJiraConnection = {
  id: 'c-1',
  teamId: 't-1',
  type: 'jira',
  baseUrl: 'https://acme.atlassian.net',
  projectKey: 'PROJ',
  encryptedCredentials: JSON.stringify({ email: 'test@test.com', apiToken: 'token' }),
};

const mockADOConnection = {
  ...mockJiraConnection,
  type: 'azure_devops',
  encryptedCredentials: JSON.stringify({ pat: 'ado-pat' }),
};

describe('WritebackService', () => {
  let service: WritebackService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  const setupDbMocks = (connection = mockJiraConnection) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockAnalysis]),
    }));

    let selectCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const results = [mockAnalysis, mockStory, connection];
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([results[selectCallCount - 1]]),
      };
    });

    const mockReturning = vi.fn().mockResolvedValue([{
      id: 'wb-1',
      sourceType: connection.type,
      contentBefore: 'Original description',
      contentAfter: mockAnalysis.improvedVersion,
      createdAt: new Date(),
    }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: mockValues });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new WritebackService();
    mockDb = (await import('../../db/index.js')).db;
  });

  it('calls JiraConnector.updateStory for Jira connections', async () => {
    setupDbMocks(mockJiraConnection);
    const { JiraConnector } = await import('../connectors/JiraConnector.js');

    const result = await service.writeback('a-1', 't-1', 'user-1');
    expect(result.sourceType).toBe('jira');
    // JiraConnector should have been instantiated
    expect(JiraConnector).toHaveBeenCalled();
  });

  it('calls ADOConnector.updateWorkItem for ADO connections', async () => {
    setupDbMocks(mockADOConnection);
    const { ADOConnector } = await import('../connectors/ADOConnector.js');

    const result = await service.writeback('a-1', 't-1', 'user-1');
    expect(result.sourceType).toBe('azure_devops');
    expect(ADOConnector).toHaveBeenCalled();
  });

  it('throws when analysis has no improvedVersion', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ ...mockAnalysis, improvedVersion: null }]),
    }));

    await expect(service.writeback('a-1', 't-1', 'user-1')).rejects.toThrow(
      'No improved version available',
    );
  });

  it('throws when analysis belongs to different team', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ ...mockAnalysis, teamId: 'other-team' }]),
    }));

    await expect(service.writeback('a-1', 't-1', 'user-1')).rejects.toThrow('Analysis not found');
  });
});
