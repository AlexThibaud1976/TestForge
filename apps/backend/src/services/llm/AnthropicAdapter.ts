import Anthropic from '@anthropic-ai/sdk';
import type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

export class AnthropicAdapter implements LLMClient {
  private client: Anthropic;
  private model: string;

  constructor(config: LLMClientConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.2, maxTokens = 4096, jsonMode = false } = options;

    // Séparer le system prompt des messages user/assistant
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Anthropic exige des messages alternés user/assistant — valider
    const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      ...(systemMessage && { system: systemMessage.content }),
      messages: anthropicMessages,
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') {
      throw new Error('Anthropic returned an empty or non-text response');
    }

    const content = block.text;

    return {
      content,
      model: response.model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    };
  }
}
