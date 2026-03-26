import type { LLMProvider } from '@testforge/shared-types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMOptions {
  temperature?: number; // défaut: 0.2 pour la génération de code
  maxTokens?: number;
  jsonMode?: boolean; // force une réponse JSON
}

export interface LLMClientConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string; // déjà déchiffré
  azureEndpoint?: string;
  azureDeployment?: string;
  ollamaEndpoint?: string; // V2: URL du serveur Ollama (ex: http://localhost:11434)
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface LLMClient {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  // Feature 010: embedding (optionnel — pas tous les providers le supportent)
  embedSupported?(): boolean;
  embed?(text: string): Promise<number[]>;
}
