import { describe, it, expect, vi } from 'vitest';
import { createLLMClient } from './index.js';
import type { LLMClientConfig } from './LLMClient.js';

vi.mock('./OpenAIAdapter.js', () => ({ OpenAIAdapter: vi.fn().mockImplementation(() => ({ provider: 'openai' })) }));
vi.mock('./AzureOpenAIAdapter.js', () => ({ AzureOpenAIAdapter: vi.fn().mockImplementation(() => ({ provider: 'azure_openai' })) }));
vi.mock('./AnthropicAdapter.js', () => ({ AnthropicAdapter: vi.fn().mockImplementation(() => ({ provider: 'anthropic' })) }));
vi.mock('./MistralAdapter.js', () => ({ MistralAdapter: vi.fn().mockImplementation(() => ({ provider: 'mistral' })) }));
vi.mock('./OllamaAdapter.js', () => ({ OllamaAdapter: vi.fn().mockImplementation(() => ({ provider: 'ollama' })) }));

const base = { model: 'test-model', apiKey: 'key' };

describe('createLLMClient factory', () => {
  it('creates OpenAIAdapter for openai provider', () => {
    const client = createLLMClient({ ...base, provider: 'openai' } as LLMClientConfig);
    expect(client).toMatchObject({ provider: 'openai' });
  });

  it('creates AzureOpenAIAdapter for azure_openai provider', () => {
    const client = createLLMClient({ ...base, provider: 'azure_openai' } as LLMClientConfig);
    expect(client).toMatchObject({ provider: 'azure_openai' });
  });

  it('creates AnthropicAdapter for anthropic provider', () => {
    const client = createLLMClient({ ...base, provider: 'anthropic' } as LLMClientConfig);
    expect(client).toMatchObject({ provider: 'anthropic' });
  });

  it('creates MistralAdapter for mistral provider', () => {
    const client = createLLMClient({ ...base, provider: 'mistral' } as LLMClientConfig);
    expect(client).toMatchObject({ provider: 'mistral' });
  });

  it('creates OllamaAdapter for ollama provider', () => {
    const client = createLLMClient({ ...base, provider: 'ollama' } as LLMClientConfig);
    expect(client).toMatchObject({ provider: 'ollama' });
  });

  it('throws for unknown provider', () => {
    expect(() => createLLMClient({ ...base, provider: 'unknown' as never })).toThrow('Unknown LLM provider');
  });
});
