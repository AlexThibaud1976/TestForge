import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AzureOpenAIAdapter } from './AzureOpenAIAdapter.js';
import type { LLMClientConfig } from './LLMClient.js';

vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    })),
    __mockCreate: mockCreate,
  };
});

const config: LLMClientConfig = {
  provider: 'azure_openai',
  model: 'gpt-4o',
  apiKey: 'azure-test-key',
  azureEndpoint: 'https://myresource.openai.azure.com',
  azureDeployment: 'my-gpt4o-deployment',
};

const mockSuccessResponse = {
  choices: [{ message: { content: '{"result": "azure"}' } }],
  model: 'gpt-4o',
  usage: { prompt_tokens: 80, completion_tokens: 40 },
};

describe('AzureOpenAIAdapter', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockCreate = (openaiModule as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue(mockSuccessResponse);
  });

  it('throws if azureEndpoint is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { azureEndpoint: _omit, ...configWithoutEndpoint } = config;
    expect(
      () => new AzureOpenAIAdapter(configWithoutEndpoint),
    ).toThrow('azureEndpoint');
  });

  it('throws if azureDeployment is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { azureDeployment: _omit, ...configWithoutDeployment } = config;
    expect(
      () => new AzureOpenAIAdapter(configWithoutDeployment),
    ).toThrow('azureDeployment');
  });

  it('returns content from Azure response', async () => {
    const adapter = new AzureOpenAIAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(result.content).toBe('{"result": "azure"}');
    expect(result.promptTokens).toBe(80);
  });

  it('uses deployment name as model in the request', async () => {
    const adapter = new AzureOpenAIAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'my-gpt4o-deployment' }),
    );
  });

  it('passes jsonMode as response_format', async () => {
    const adapter = new AzureOpenAIAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }], { jsonMode: true });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
  });
});
