import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManualTestService } from './ManualTestService.js';

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      analyses: { findFirst: vi.fn() },
      userStories: { findFirst: vi.fn() },
      llmConfigs: { findFirst: vi.fn() },
      manualTestSets: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../llm/index.js', () => ({
  createLLMClient: vi.fn(() => ({ complete: vi.fn() })),
}));

vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

const mockAnalysis = {
  id: 'a-1', teamId: 't-1', userStoryId: 's-1',
  scoreGlobal: 75, suggestions: [], improvedVersion: 'Improved US...',
};
const mockStory = {
  id: 's-1', teamId: 't-1', title: 'Login',
  description: 'User login', acceptanceCriteria: 'User can login\nUser sees dashboard',
};
const mockLLMConfig = {
  id: 'l-1', teamId: 't-1', provider: 'openai', model: 'gpt-4o',
  encryptedApiKey: 'sk-test', azureEndpoint: null, azureDeployment: null, ollamaEndpoint: null, isDefault: true,
};
const mockSet = {
  id: 'mts-1', analysisId: 'a-1', teamId: 't-1', userStoryId: 's-1',
  status: 'draft', usedImprovedVersion: false, version: 1,
  excludedCriteria: [], llmProvider: 'openai', llmModel: 'gpt-4o', promptVersion: 'v1.0',
  validatedAt: null, validatedBy: null, pushedAt: null, pushTarget: null,
  createdAt: new Date(), updatedAt: new Date(),
};
const mockCase = {
  id: 'mtc-1', manualTestSetId: 'mts-1', teamId: 't-1', title: 'Login valid',
  precondition: null, priority: 'critical', category: 'happy_path',
  steps: [{ stepNumber: 1, action: 'Navigate to /login', expectedResult: 'Login page shown' }],
  sortOrder: 0, externalId: null, externalUrl: null, externalSource: null,
  createdAt: new Date(), updatedAt: new Date(),
};

const validLLMResponse = JSON.stringify({
  testCases: [
    {
      title: 'Login with valid credentials',
      precondition: 'User has an account',
      priority: 'critical',
      category: 'happy_path',
      steps: [
        { action: 'Navigate to /login', expectedResult: 'Login page shown' },
        { action: 'Enter valid credentials', expectedResult: 'Fields populated' },
        { action: 'Click Submit', expectedResult: 'Redirected to dashboard' },
      ],
    },
    {
      title: 'Login with wrong password',
      precondition: 'User has an account',
      priority: 'high',
      category: 'error_case',
      steps: [
        { action: 'Navigate to /login', expectedResult: 'Login page shown' },
        { action: 'Enter wrong password', expectedResult: 'Field shows error' },
        { action: 'Click Submit', expectedResult: 'Error message displayed' },
      ],
    },
  ],
  excludedCriteria: [{ criterion: 'Response < 2s', reason: 'Performance criterion' }],
});

describe('ManualTestService', () => {
  let service: ManualTestService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateLLMClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new ManualTestService();
    mockDb = (await import('../../db/index.js')).db;
    mockCreateLLMClient = (await import('../llm/index.js')).createLLMClient;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.analyses.findFirst.mockResolvedValue(mockAnalysis);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.userStories.findFirst.mockResolvedValue(mockStory);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.llmConfigs.findFirst.mockResolvedValue(mockLLMConfig);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.manualTestSets.findFirst.mockResolvedValue(null);

    const mockComplete = vi.fn().mockResolvedValue({ content: validLLMResponse });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    mockCreateLLMClient.mockReturnValue({ complete: mockComplete });

    const setReturning = vi.fn().mockResolvedValue([mockSet]);
    const setValues = vi.fn().mockReturnValue({ returning: setReturning });
    const caseReturning = vi.fn().mockResolvedValue([mockCase, { ...mockCase, id: 'mtc-2', title: 'Login wrong' }]);
    const caseValues = vi.fn().mockReturnValue({ returning: caseReturning });

    let insertCallCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) return { values: setValues }; // manualTestSets
      return { values: caseValues }; // manualTestCases
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([mockCase]),
    });
  });

  describe('generate()', () => {
    it('crée un ManualTestSet avec les test cases depuis la réponse LLM', async () => {
      const result = await service.generate('a-1', 't-1', false);
      expect(result.id).toBe('mts-1');
      expect(result.status).toBe('draft');
      expect(result.version).toBe(1);
      expect(result.llmProvider).toBe('openai');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // set + cases
    });

    it('set lowScoreWarning = true si scoreGlobal < 40', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst.mockResolvedValue({ ...mockAnalysis, scoreGlobal: 35 });
      const result = await service.generate('a-1', 't-1', false);
      expect(result.lowScoreWarning).toBe(true);
    });

    it('throw si l\'US n\'a pas d\'acceptance criteria', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.userStories.findFirst.mockResolvedValue({ ...mockStory, acceptanceCriteria: '' });
      await expect(service.generate('a-1', 't-1', false)).rejects.toThrow('critères d\'acceptance');
    });

    it('throw si l\'analyse n\'est pas trouvée', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst.mockResolvedValue(null);
      await expect(service.generate('a-1', 't-1', false)).rejects.toThrow('Analysis not found');
    });
  });

  describe('update()', () => {
    it('remplace tous les test cases et retourne le set mis à jour', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.manualTestSets.findFirst.mockResolvedValue(mockSet);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
      const updateReturning = vi.fn().mockResolvedValue([{ ...mockSet, updatedAt: new Date() }]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue({ returning: updateReturning }) });
      const caseReturning = vi.fn().mockResolvedValue([mockCase]);
      const caseValues = vi.fn().mockReturnValue({ returning: caseReturning });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: caseValues });

      const result = await service.update('mts-1', 't-1', [
        { title: 'Updated test', priority: 'high', category: 'happy_path', steps: [{ action: 'Do X', expectedResult: 'X done' }] },
      ]);
      expect(result.id).toBe('mts-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it('throw si le set est déjà pushed', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.manualTestSets.findFirst.mockResolvedValue({ ...mockSet, status: 'pushed' });
      await expect(service.update('mts-1', 't-1', [])).rejects.toThrow('pushed test set');
    });
  });

  describe('validate()', () => {
    it('passe le status à validated et renseigne validatedAt + validatedBy', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.manualTestSets.findFirst.mockResolvedValue(mockSet);
      const now = new Date();
      const updateReturning = vi.fn().mockResolvedValue([{ ...mockSet, status: 'validated', validatedAt: now, validatedBy: 'user-1' }]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.update.mockReturnValue({ set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnValue({ returning: updateReturning }) });

      const result = await service.validate('mts-1', 't-1', 'user-1');
      expect(result.status).toBe('validated');
      expect(result.validatedBy).toBe('user-1');
      expect(result.validatedAt).not.toBeNull();
    });
  });

  describe('regenerate()', () => {
    it('incrémente la version par rapport à la version existante', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.manualTestSets.findFirst.mockResolvedValue({ ...mockSet, version: 2 });
      const setReturning = vi.fn().mockResolvedValue([{ ...mockSet, version: 3 }]);
      const setValues = vi.fn().mockReturnValue({ returning: setReturning });
      const caseReturning = vi.fn().mockResolvedValue([mockCase]);
      const caseValues = vi.fn().mockReturnValue({ returning: caseReturning });

      let insertCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockImplementation(() => {
        insertCount++;
        return { values: insertCount === 1 ? setValues : caseValues };
      });

      const result = await service.regenerate('a-1', 't-1', false);
      expect(result.version).toBe(3);
    });
  });
});
