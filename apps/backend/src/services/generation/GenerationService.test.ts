import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationService } from './GenerationService.js';

vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      analyses:    { findFirst: vi.fn() },
      userStories: { findFirst: vi.fn() },
      llmConfigs:  { findFirst: vi.fn() },
      generations: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock('../llm/index.js', () => ({
  createLLMClient: vi.fn(() => ({ complete: vi.fn() })),
}));

vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

const mockAnalysis = { id: 'a-1', teamId: 't-1', userStoryId: 's-1', improvedVersion: 'Improved US...' };
const mockStory = { id: 's-1', teamId: 't-1', title: 'Login', description: 'User login flow', acceptanceCriteria: 'Login works' };
const mockLLMConfig = { id: 'l-1', teamId: 't-1', provider: 'openai', model: 'gpt-4o', encryptedApiKey: 'sk-test', azureEndpoint: null, azureDeployment: null, isDefault: true };
const mockGeneration = { id: 'g-1', teamId: 't-1', analysisId: 'a-1', framework: 'playwright', language: 'typescript', usedImprovedVersion: false, llmProvider: 'openai', llmModel: 'gpt-4o', promptVersion: 'v1.0', status: 'pending', createdAt: new Date() };

const validLLMResponse = JSON.stringify({
  files: [
    { type: 'page_object', filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
    { type: 'test_spec', filename: 'tests/login.spec.ts', content: "import { test } from '@playwright/test';" },
    { type: 'fixtures', filename: 'fixtures/login.json', content: '{"validUser":{"email":"test@test.com"}}' },
  ],
});

describe('GenerationService', () => {
  let service: GenerationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateLLMClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new GenerationService();
    mockDb = (await import('../../db/index.js')).db;
    mockCreateLLMClient = (await import('../llm/index.js')).createLLMClient;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.analyses.findFirst.mockResolvedValue(mockAnalysis);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.userStories.findFirst.mockResolvedValue(mockStory);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.llmConfigs.findFirst.mockResolvedValue(mockLLMConfig);

    const mockReturning = vi.fn().mockResolvedValue([mockGeneration]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: mockValues });

    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.update.mockReturnValue({ set: mockSet });

    // Mock pour generate() qui appelle query.generations + select
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.generations.findFirst.mockResolvedValue({ ...mockGeneration, status: 'success', durationMs: 1000 });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([
      { fileType: 'page_object', filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
      { fileType: 'test_spec', filename: 'tests/login.spec.ts', content: "import { test } from '@playwright/test';" },
      { fileType: 'fixtures', filename: 'fixtures/login.json', content: '{}' },
    ]) }) });

    const mockComplete = vi.fn().mockResolvedValue({ content: validLLMResponse, model: 'gpt-4o', promptTokens: 200, completionTokens: 800 });
    mockCreateLLMClient.mockReturnValue({ complete: mockComplete });
  });

  describe('generate', () => {
    it('retourne les 3 fichiers générés', async () => {
      const result = await service.generate('a-1', 't-1', false);
      expect(result.files).toHaveLength(3);
      expect(result.files.map((f) => f.type)).toEqual(['page_object', 'test_spec', 'fixtures']);
    });

    it('status est success', async () => {
      const result = await service.generate('a-1', 't-1', false);
      expect(result.status).toBe('success');
    });

    it('lève une erreur si analyse introuvable', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.analyses.findFirst.mockResolvedValue(null);
      await expect(service.generate('x', 't-1', false)).rejects.toThrow('Analysis not found');
    });

    it('lève une erreur si pas de LLM config', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.query.llmConfigs.findFirst.mockResolvedValue(null);
      await expect(service.generate('a-1', 't-1', false)).rejects.toThrow('No default LLM');
    });

    it('extrait le JSON même si le LLM ajoute du texte autour', async () => {
      const mockComplete = vi.fn().mockResolvedValue({ content: 'Voici le code :\n' + validLLMResponse, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
      mockCreateLLMClient.mockReturnValue({ complete: mockComplete });
      const result = await service.generate('a-1', 't-1', false);
      expect(result.files).toHaveLength(3);
    });
  });

  describe('buildZip', () => {
    it('génère un buffer ZIP non vide', async () => {
      const files = [
        { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
        { type: 'test_spec' as const, filename: 'tests/login.spec.ts', content: 'test("works", () => {})' },
        { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{}' },
      ];
      const buffer = await service.buildZip(files);
      expect(buffer.length).toBeGreaterThan(0);
      // ZIP magic bytes: PK\x03\x04
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });
  });
});
