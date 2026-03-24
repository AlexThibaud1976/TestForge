import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicAdapter } from './AnthropicAdapter.js';
import type { LLMClientConfig } from './LLMClient.js';

vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

const config: LLMClientConfig = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: 'sk-ant-test-key',
};

const mockSuccessResponse = {
  content: [{ type: 'text', text: '"result": "ok"}' }],
  model: 'claude-3-5-sonnet-20241022',
  usage: { input_tokens: 120, output_tokens: 60 },
};

describe('AnthropicAdapter', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const anthropicModule = await import('@anthropic-ai/sdk');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    mockCreate = (anthropicModule as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue(mockSuccessResponse);
  });

  it('returns content from Anthropic response', async () => {
    const adapter = new AnthropicAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'hello' }]);
    expect(result.content).toBe('"result": "ok"}');
    expect(result.model).toBe('claude-3-5-sonnet-20241022');
    expect(result.promptTokens).toBe(120);
    expect(result.completionTokens).toBe(60);
  });

  it('returns content as-is when jsonMode is true (no prefill on Claude 4.x)', async () => {
    const adapter = new AnthropicAdapter(config);
    const result = await adapter.complete([{ role: 'user', content: 'hello' }], { jsonMode: true });
    expect(result.content).toBe('"result": "ok"}');
  });

  it('extracts system message and passes it separately', async () => {
    const adapter = new AnthropicAdapter(config);
    await adapter.complete([
      { role: 'system', content: 'You are a QA expert.' },
      { role: 'user', content: 'Analyze this US.' },
    ]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'You are a QA expert.' }),
    );
  });

  it('throws if response has no text block', async () => {
    mockCreate.mockResolvedValue({ content: [], model: 'claude', usage: { input_tokens: 0, output_tokens: 0 } });
    const adapter = new AnthropicAdapter(config);
    await expect(adapter.complete([{ role: 'user', content: 'hello' }])).rejects.toThrow(
      'empty or non-text response',
    );
  });
});
