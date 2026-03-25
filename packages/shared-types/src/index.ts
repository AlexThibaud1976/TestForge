// ─── Teams ────────────────────────────────────────────────────────────────────

export type Plan = 'trial' | 'starter' | 'pro';
export type MemberRole = 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  plan: Plan;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}

// ─── Source Connections ────────────────────────────────────────────────────────

export type SourceType = 'jira' | 'azure_devops';

export interface SourceConnection {
  id: string;
  teamId: string;
  type: SourceType;
  name: string;
  baseUrl: string;
  projectKey: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

// ─── LLM ──────────────────────────────────────────────────────────────────────

export type LLMProvider = 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama';

export interface LLMConfig {
  id: string;
  teamId: string;
  provider: LLMProvider;
  model: string;
  azureEndpoint: string | null;
  azureDeployment: string | null;
  isDefault: boolean;
  createdAt: string;
}

// ─── User Stories ─────────────────────────────────────────────────────────────

export interface UserStory {
  id: string;
  teamId: string;
  connectionId: string;
  externalId: string;
  title: string;
  description: string;
  acceptanceCriteria: string | null;
  labels: string[];
  status: string;
  fetchedAt: string;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

export type SuggestionPriority = 'critical' | 'recommended' | 'optional';

export interface AnalysisSuggestion {
  priority: SuggestionPriority;
  issue: string;
  suggestion: string;
}

export interface Analysis {
  id: string;
  userStoryId: string;
  teamId: string;
  scoreGlobal: number;
  scoreClarity: number;
  scoreCompleteness: number;
  scoreTestability: number;
  scoreEdgeCases: number;
  scoreAcceptanceCriteria: number;
  suggestions: AnalysisSuggestion[];
  improvedVersion: string | null;
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  createdAt: string;
}

// ─── Generation ───────────────────────────────────────────────────────────────

export type GenerationStatus = 'pending' | 'success' | 'error';
export type FileType = 'page_object' | 'test_spec' | 'fixtures';

export interface GeneratedFile {
  type: FileType;
  filename: string;
  content: string;
}

export interface Generation {
  id: string;
  analysisId: string;
  teamId: string;
  framework: 'playwright';
  language: 'typescript';
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  files: GeneratedFile[];
  status: GenerationStatus;
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
