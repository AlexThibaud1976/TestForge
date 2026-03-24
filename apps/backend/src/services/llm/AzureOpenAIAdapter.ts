import OpenAI from 'openai';
import type { LLMClient, LLMClientConfig, LLMMessage, LLMOptions, LLMResponse } from './LLMClient.js';

export class AzureOpenAIAdapter implements LLMClient {
  private client: OpenAI;
  private deployment: string;

  constructor(config: LLMClientConfig) {
    if (!config.azureEndpoint) {
      throw new Error('AzureOpenAIAdapter requires azureEndpoint in config');
    }
    if (!config.azureDeployment) {
      throw new Error('AzureOpenAIAdapter requires azureDeployment in config');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.azureEndpoint}/openai/deployments/${config.azureDeployment}`,
      defaultQuery: { 'api-version': '2024-02-01' },
      defaultHeaders: { 'api-key': config.apiKey },
    });

    this.deployment = config.azureDeployment;
  }

  async complete(messages: LLMMessage[], options: LLMOptions = {}): Promise<LLMResponse> {
    const { temperature = 0.2, maxTokens, jsonMode = false } = options;

    // Azure OpenAI utilise le deployment name comme model
    const response = await this.client.chat.completions.create({
      model: this.deployment,
      messages,
      temperature,
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    });

    const choice = response.choices[0];
    if (!choice?.message.content) {
      throw new Error('Azure OpenAI returned an empty response');
    }

    return {
      content: choice.message.content,
      model: response.model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
