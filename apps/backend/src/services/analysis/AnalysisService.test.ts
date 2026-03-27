import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisService } from './AnalysisService.js';

// Hoisted pour éviter le problème de TDZ avec vi.mock
const { mockUpdate } = vi.hoisted(() => {
  const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
  const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));
  return { mockUpdate };
});

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      analyses: { findFirst: vi.fn() },
      userStories: { findFirst: vi.fn() },
      llmConfigs: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
    update: mockUpdate,
  },
}));

// Mock LLM factory
vi.mock('../llm/index.js', () => ({
  createLLMClient: vi.fn(() => ({
    complete: vi.fn(),
  })),
}));

// Mock encryption
vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

const mockStory = {
  id: 'story-1',
  teamId: 'team-1',
  title: 'Connexion utilisateur',
  description: 'En tant qu\'utilisateur, je veux me connecter avec email et mot de passe.',
  acceptanceCriteria: 'La connexion réussit avec des credentials valides.',
};

const mockLLMConfig = {
  id: 'llm-1',
  teamId: 'team-1',
  provider: 'openai',
  model: 'gpt-4o',
  encryptedApiKey: 'sk-test',
  azureEndpoint: null,
  azureDeployment: null,
  isDefault: true,
};

const validLLMResponse = JSON.stringify({
  scoreGlobal: 72,
  dimensions: { clarity: 75, completeness: 80, testability: 70, edgeCases: 55, acceptanceCriteria: 78 },
  suggestions: [{ priority: 'recommended', issue: 'Pas de cas erreur', suggestion: 'Ajouter cas email invalide' }],
  improvedVersion: 'Version améliorée de la US...',
});

describe('AnalysisService', () => {
  let service: AnalysisService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateLLMClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AnalysisService();
    mockDb = (await import('../../db/index.js')).db;
    mockCreateLLMClient = (await import('../llm/index.js')).createLLMClient;
  });

  describe('analyze — cache hit', () => {
    it('retourne l\'analyse en cache si < 24h et US non modifiée', async () => {
      const now = new Date();
      const cachedAnalysis = { id: 'cached-1', userStoryId: 'story-1', teamId: 'team-1', scoreGlobal: 65, scoreClarity: 60, scoreCompleteness: 70, scoreTestability: 65, scoreEdgeCases: 50, scoreAcceptanceCriteria: 68, suggestions: [], improvedVersion: null, llmProvider: 'openai', llmModel: 'gpt-4o', promptVersion: 'v1.0', createdAt: now };
      // La US a été fetchée AVANT l'analyse → cache valide
      const storyFetchedBefore = { ...mockStory, fetchedAt: new Date(now.getTime() - 1000) };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.userStories.findFirst.mockResolvedValue(storyFetchedBefore);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst.mockResolvedValue(cachedAnalysis);

      const result = await service.analyze('story-1', 'team-1');

      expect(result.id).toBe('cached-1');
      expect(mockCreateLLMClient).not.toHaveBeenCalled();
    });
  });

  const fullAnalysisRow = { id: 'new-1', userStoryId: 'story-1', teamId: 'team-1', status: 'success', progressStep: null, durationMs: 1000, scoreGlobal: 72, scoreClarity: 75, scoreCompleteness: 80, scoreTestability: 70, scoreEdgeCases: 55, scoreAcceptanceCriteria: 78, suggestions: [], improvedVersion: 'Version améliorée...', improvedDescription: null, improvedAcceptanceCriteria: null, llmProvider: 'openai', llmModel: 'gpt-4o', promptVersion: 'v1.0', createdAt: new Date() };

  describe('analyze — cache miss', () => {
    beforeEach(() => {
      // analyses.findFirst: null (cache check) puis résultat complet (getById)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fullAnalysisRow);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.userStories.findFirst.mockResolvedValue({ ...mockStory, fetchedAt: new Date(0) });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue(mockLLMConfig);

      const mockComplete = vi.fn().mockResolvedValue({ content: validLLMResponse, model: 'gpt-4o', promptTokens: 100, completionTokens: 200 });
      mockCreateLLMClient.mockReturnValue({ complete: mockComplete });

      // createPending: insert → returning [{ id: 'new-1', status: 'pending' }]
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'new-1', status: 'pending' }]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: mockValues });
    });

    it('appelle le LLM et persiste l\'analyse', async () => {
      const result = await service.analyze('story-1', 'team-1');
      expect(result.scoreGlobal).toBe(72);
      expect(mockCreateLLMClient).toHaveBeenCalledOnce();
    });

    it('lève une erreur si pas de LLM config', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue(null);
      await expect(service.analyze('story-1', 'team-1')).rejects.toThrow('No default LLM configuration');
    });

    it('lève une erreur si US introuvable', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.userStories.findFirst.mockResolvedValue(null);
      await expect(service.analyze('story-1', 'team-1')).rejects.toThrow('User story not found');
    });
  });

  describe('parseResponse (via analyze)', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fullAnalysisRow);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.userStories.findFirst.mockResolvedValue({ ...mockStory, fetchedAt: new Date(0) });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue(mockLLMConfig);
      // createPending
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'x', status: 'pending' }]);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });
    });

    it('extrait le JSON même si le LLM ajoute du texte autour', async () => {
      const mockComplete = vi.fn().mockResolvedValue({ content: 'Voici le résultat : ' + validLLMResponse + ' Fin.', model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
      mockCreateLLMClient.mockReturnValue({ complete: mockComplete });
      await expect(service.analyze('story-1', 'team-1')).resolves.toBeDefined();
    });

    it('lève une erreur si la réponse n\'est pas du JSON', async () => {
      const mockComplete = vi.fn().mockResolvedValue({ content: 'Je ne suis pas un JSON.', model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
      mockCreateLLMClient.mockReturnValue({ complete: mockComplete });
      await expect(service.analyze('story-1', 'team-1')).rejects.toThrow('not valid JSON');
    });
  });
});
