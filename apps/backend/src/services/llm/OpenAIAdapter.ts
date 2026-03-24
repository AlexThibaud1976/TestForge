import OpenAI from 'openai';
import type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

export class OpenAIAdapter implements LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMClientConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.2, maxTokens, jsonMode = false } = options;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature,
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });

    const choice = response.choices[0];
    if (!choice?.message.content) {
      throw new Error('OpenAI returned an empty response');
    }

    return {
      content: choice.message.content,
      model: response.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
