import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaAdapter } from './OllamaAdapter.js';
import type { LLMClientConfig } from './LLMClient.js';

// Reuse the openai mock (Ollama uses OpenAI SDK with custom baseURL)
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
  provider: 'ollama',
  model: 'llama3:8b',
  apiKey: 'ollama',
  ollamaEndpoint: 'http://localhost:11434',
};

const mockResponse = {
  choices: [{ message: { content: '{"files": []}' } }],
  model: 'llama3:8b',
  usage: { prompt_tokens: 60, completion_tokens: 30 },
};

describe('OllamaAdapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreate: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockCreate = (openaiModule as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue(mockResponse);
  });

  it('returns content from Ollama response', async () => {
    const adapter = new OllamaAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'generate' }]);
    expect(result.content).toBe('{"files": []}');
    expect(result.model).toBe('llama3:8b');
    expect(result.promptTokens).toBe(60);
    expect(result.completionTokens).toBe(30);
  });

  it('constructs OpenAI client with ollama baseURL', async () => {
    const OpenAI = (await import('openai')).default;
    new OllamaAdapter(config);
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:11434/v1',
        apiKey: 'ollama',
      }),
    );
  });

  it('falls back to localhost:11434 when no ollamaEndpoint', async () => {
    const OpenAI = (await import('openai')).default;
    const configNoEndpoint: LLMClientConfig = { ...config, ollamaEndpoint: undefined };
    new OllamaAdapter(configNoEndpoint);
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'http://localhost:11434/v1' }),
    );
  });

  it('passes maxTokens when specified', async () => {
    const adapter = new OllamaAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }], { maxTokens: 2000 });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 2000 }));
  });

  it('throws when response has no content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }], model: 'llama3:8b', usage: null });
    const adapter = new OllamaAdapter(config);
    await expect(adapter.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow('empty response');
  });
});
