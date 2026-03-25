import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MistralAdapter } from './MistralAdapter.js';
import type { LLMClientConfig } from './LLMClient.js';

vi.mock('@mistralai/mistralai', () => {
  const mockComplete = vi.fn();
  return {
    Mistral: vi.fn().mockImplementation(() => ({
      chat: { complete: mockComplete },
    })),
    __mockComplete: mockComplete,
  };
});

const config: LLMClientConfig = {
  provider: 'mistral',
  model: 'mistral-large-latest',
  apiKey: 'mk-test-key',
};

const mockResponse = {
  choices: [{ message: { content: '{"result": "ok"}' } }],
  model: 'mistral-large-latest',
  usage: { promptTokens: 80, completionTokens: 40 },
};

describe('MistralAdapter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockComplete: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@mistralai/mistralai');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockComplete = (mod as any).__mockComplete as ReturnType<typeof vi.fn>;
    mockComplete.mockResolvedValue(mockResponse);
  });

  it('returns content from Mistral response', async () => {
    const adapter = new MistralAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(result.content).toBe('{"result": "ok"}');
    expect(result.model).toBe('mistral-large-latest');
    expect(result.promptTokens).toBe(80);
    expect(result.completionTokens).toBe(40);
  });

  it('passes temperature and maxTokens to Mistral', async () => {
    const adapter = new MistralAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }], { temperature: 0.5, maxTokens: 500 });
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.5, maxTokens: 500 }),
    );
  });

  it('uses default temperature 0.2', async () => {
    const adapter = new MistralAdapter(config);
    await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.2 }));
  });

  it('throws when Mistral returns empty content', async () => {
    mockComplete.mockResolvedValue({ choices: [{ message: { content: '' } }], model: 'mistral-large-latest', usage: null });
    const adapter = new MistralAdapter(config);
    await expect(adapter.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow('empty response');
  });

  it('maps messages correctly including system role', async () => {
    const adapter = new MistralAdapter(config);
    await adapter.complete([
      { role: 'system', content: 'You are a test expert' },
      { role: 'user', content: 'Generate tests' },
    ]);
    expect(mockComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system', content: 'You are a test expert' }),
          expect.objectContaining({ role: 'user', content: 'Generate tests' }),
        ]),
      }),
    );
  });
});
