import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter } from './OpenAIAdapter.js';
import type { LLMClientConfig } from './LLMClient.js';

// Mock du SDK OpenAI
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
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'sk-test-key',
};

const mockSuccessResponse = {
  choices: [{ message: { content: '{"result": "ok"}' } }],
  model: 'gpt-4o',
  usage: { prompt_tokens: 100, completion_tokens: 50 },
};

describe('OpenAIAdapter', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import('openai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockCreate = (openaiModule as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue(mockSuccessResponse);
  });

  it('returns the content from the LLM response', async () => {
    const adapter = new OpenAIAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(result.content).toBe('{"result": "ok"}');
    expect(result.model).toBe('gpt-4o');
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
  });

  it('passes jsonMode as response_format json_object', async () => {
    const adapter = new OpenAIAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }], { jsonMode: true });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: 'json_object' } }),
    );
  });

  it('uses default temperature 0.2', async () => {
    const adapter = new OpenAIAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.2 }));
  });

  it('throws if response has no content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }], model: 'gpt-4o', usage: null });
    const adapter = new OpenAIAdapter(config);
    await expect(adapter.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow(
      'empty response',
    );
  });
});
