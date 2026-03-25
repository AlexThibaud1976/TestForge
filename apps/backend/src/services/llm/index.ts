import { OpenAIAdapter } from './OpenAIAdapter.js';
import { AzureOpenAIAdapter } from './AzureOpenAIAdapter.js';
import { AnthropicAdapter } from './AnthropicAdapter.js';
import { MistralAdapter } from './MistralAdapter.js';
import { OllamaAdapter } from './OllamaAdapter.js';
import type { LLMClient, LLMClientConfig } from './LLMClient.js';

export type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

/**
 * Factory — instancie l'adapter LLM approprié selon la config de l'équipe.
 * La config doit contenir l'apiKey déjà déchiffrée (via decrypt()).
 */
export function createLLMClient(config: LLMClientConfig): LLMClient {
  switch (config.provider) {
    case 'openai':
      return new OpenAIAdapter(config);
    case 'azure_openai':
      return new AzureOpenAIAdapter(config);
    case 'anthropic':
      return new AnthropicAdapter(config);
    case 'mistral':
      return new MistralAdapter(config);
    case 'ollama':
      return new OllamaAdapter(config);
    default: {
      const exhaustive: never = config.provider;
      throw new Error(`Unknown LLM provider: ${String(exhaustive)}`);
    }
  }
}
