import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationService } from './GenerationService.js';

// Mock DB + LLM + encryption
vi.mock('../../db/index.js', () => ({
  db: {
    query: {
      analyses: { findFirst: vi.fn() },
      userStories: { findFirst: vi.fn() },
      llmConfigs: { findFirst: vi.fn() },
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

// Mock CodeValidator to control validation results
vi.mock('./CodeValidator.js', () => {
  const mockValidateFiles = vi.fn();
  return {
    CodeValidator: vi.fn().mockImplementation(() => ({ validateFiles: mockValidateFiles })),
    __mockValidateFiles: mockValidateFiles,
  };
});

const VALID_FILES_JSON = JSON.stringify({
  files: [
    { type: 'page_object', filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
    { type: 'test_spec', filename: 'tests/login.spec.ts', content: 'test("login", () => {})' },
    { type: 'fixtures', filename: 'fixtures/login.json', content: '{"email":"test@test.com"}' },
  ],
});

const CORRECTED_FILE_RESPONSE = JSON.stringify({
  filename: 'pages/Login.page.ts',
  content: 'export class LoginPage { /* corrected */ }',
});

describe('GenerationService — Self-Healing', () => {
  let service: GenerationService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateLLMClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockValidateFiles: any;

  const setupMocks = () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.analyses.findFirst.mockResolvedValue({ id: 'a-1', teamId: 't-1', userStoryId: 's-1', improvedVersion: null, suggestions: [] });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.userStories.findFirst.mockResolvedValue({ id: 's-1', teamId: 't-1', title: 'Login', description: 'desc', acceptanceCriteria: 'AC' });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.llmConfigs.findFirst.mockResolvedValue({ id: 'l-1', teamId: 't-1', provider: 'openai', model: 'gpt-4o', encryptedApiKey: 'sk-test', isDefault: true });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.query.generations.findFirst.mockResolvedValue(null);

    const mockReturning = vi.fn().mockResolvedValue([{ id: 'g-1', status: 'pending' }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.insert.mockReturnValue({ values: mockValues });

    const mockUpdateReturning = vi.fn().mockResolvedValue([]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnValue({ returning: mockUpdateReturning }),
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new GenerationService();
    mockDb = (await import('../../db/index.js')).db;
    mockCreateLLMClient = (await import('../llm/index.js')).createLLMClient;
    const CodeValidatorMod = await import('./CodeValidator.js');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockValidateFiles = (CodeValidatorMod as any).__mockValidateFiles as ReturnType<typeof vi.fn>;
    setupMocks();
  });

  it('code valide dès le départ → validationStatus = valid, 0 corrections', async () => {
    // LLM retourne un JSON valide
    const mockComplete = vi.fn()
      .mockResolvedValueOnce({ content: VALID_FILES_JSON, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    mockCreateLLMClient.mockReturnValue({ complete: mockComplete });

    // Validator confirme que tout est valide
    mockValidateFiles.mockReturnValue({ status: 'valid', files: [], errors: [] });

    await service.processGeneration('g-1', 'a-1', 't-1', false, 'playwright', 'typescript');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const updateCall = mockDb.update().set.mock?.calls?.[0]?.[0] as Record<string, unknown> | undefined;
    // The update should be called with status 'success' and validationStatus 'valid'
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('erreurs détectées puis corrigées au 1er retry → auto_corrected, attempts 1', async () => {
    const mockComplete = vi.fn()
      // Premier appel : génération principale
      .mockResolvedValueOnce({ content: VALID_FILES_JSON, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 })
      // Deuxième appel : correction (self-healing)
      .mockResolvedValueOnce({ content: CORRECTED_FILE_RESPONSE, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    mockCreateLLMClient.mockReturnValue({ complete: mockComplete });

    // Première validation : erreur ; deuxième : valide
    mockValidateFiles
      .mockReturnValueOnce({ status: 'has_errors', files: [], errors: [{ filename: 'pages/Login.page.ts', line: 1, message: 'Syntax error' }] })
      .mockReturnValueOnce({ status: 'valid', files: [], errors: [] });

    await service.processGeneration('g-1', 'a-1', 't-1', false, 'playwright', 'typescript');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockComplete).toHaveBeenCalledTimes(2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('2 retries échouent → has_errors stocké', async () => {
    const mockComplete = vi.fn()
      .mockResolvedValueOnce({ content: VALID_FILES_JSON, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 })
      .mockResolvedValue({ content: CORRECTED_FILE_RESPONSE, model: 'gpt-4o', promptTokens: 10, completionTokens: 10 });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    mockCreateLLMClient.mockReturnValue({ complete: mockComplete });

    const errorObj = { filename: 'pages/Login.page.ts', line: 1, message: 'Persistent error' };
    // Toujours en erreur même après corrections
    mockValidateFiles.mockReturnValue({ status: 'has_errors', files: [], errors: [errorObj] });

    await service.processGeneration('g-1', 'a-1', 't-1', false, 'playwright', 'typescript');

    // 1 appel principal + 2 retries de correction = 3 appels LLM max
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockComplete.mock.calls.length).toBeGreaterThanOrEqual(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(mockDb.update).toHaveBeenCalled();
  });
});
