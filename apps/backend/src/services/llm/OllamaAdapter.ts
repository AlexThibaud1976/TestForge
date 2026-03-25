import OpenAI from 'openai';
import type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

/**
 * Ollama expose une API compatible OpenAI sur /v1/chat/completions.
 * On réutilise le SDK OpenAI avec un baseURL personnalisé.
 */
export class OllamaAdapter implements LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMClientConfig) {
    const baseURL = (config.ollamaEndpoint ?? 'http://localhost:11434') + '/v1';
    this.client = new OpenAI({
      apiKey: 'ollama', // placeholder requis par le SDK OpenAI, ignoré par Ollama
      baseURL,
    });
    this.model = config.model;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.2, maxTokens } = options;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature,
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
    });

    const choice = response.choices[0];
    if (!choice?.message.content) {
      throw new Error('Ollama returned an empty response');
    }

    return {
      content: choice.message.content,
      model: response.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
