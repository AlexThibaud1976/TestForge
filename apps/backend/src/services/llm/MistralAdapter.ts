import { Mistral } from '@mistralai/mistralai';
import type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

export class MistralAdapter implements LLMClient {
  private client: Mistral;
  private model: string;

  constructor(config: LLMClientConfig) {
    this.client = new Mistral({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.2, maxTokens } = options;

    // Mistral supporte le rôle 'system' sur mistral-large — on le passe tel quel
    const response = await this.client.chat.complete({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      ...(maxTokens !== undefined && { maxTokens }),
    });

    const choice = response.choices?.[0];
    const content = typeof choice?.message.content === 'string'
      ? choice.message.content
      : '';

    if (!content) throw new Error('Mistral returned an empty response');

    return {
      content,
      model: response.model ?? this.model,
      promptTokens: response.usage?.promptTokens ?? 0,
      completionTokens: response.usage?.completionTokens ?? 0,
    };
  }
}
