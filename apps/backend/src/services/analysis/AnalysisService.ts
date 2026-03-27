import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, llmConfigs, userStories } from '../../db/schema.js';
import { createLLMClient } from '../llm/index.js';
import { decrypt } from '../../utils/encryption.js';
import {
  ANALYSIS_PROMPT_VERSION,
  ANALYSIS_SYSTEM_PROMPT,
  buildAnalysisUserPrompt,
} from './prompts/analysis-v1.0.js';
import type { AnalysisSuggestion } from '@testforge/shared-types';

// ─── Types internes ────────────────────────────────────────────────────────────

interface LLMAnalysisResponse {
  scoreGlobal: number;
  dimensions: {
    clarity: number;
    completeness: number;
    testability: number;
    edgeCases: number;
    acceptanceCriteria: number;
  };
  suggestions: AnalysisSuggestion[];
  improvedVersion: string;
  // Fix 012: champs séparés
  improvedDescription?: string | undefined;
  improvedAcceptanceCriteria?: string | undefined;
}

export interface AnalysisResult {
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
  createdAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AnalysisService {
  /**
   * Lance ou retourne l'analyse d'une US.
   * Cache : si une analyse < 24h existe pour la même US, on la retourne directement.
   */
  async analyze(userStoryId: string, teamId: string): Promise<AnalysisResult> {
    // 1. Récupérer la US en premier (on en a besoin pour la comparaison de date)
    const story = await db.query.userStories.findFirst({
      where: and(eq(userStories.id, userStoryId), eq(userStories.teamId, teamId)),
    });
    if (!story) throw new Error('User story not found');

    // 2. Vérifier le cache (analyse < 24h ET antérieure à la dernière synchro de la US)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cached = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.userStoryId, userStoryId),
        eq(analyses.teamId, teamId),
        gt(analyses.createdAt, oneDayAgo),
      ),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    // Invalider le cache si la US a été re-syncée après la dernière analyse
    if (cached && cached.createdAt >= story.fetchedAt) {
      return this.toResult(cached);
    }

    // 3. Récupérer la config LLM par défaut de l'équipe
    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) throw new Error('No default LLM configuration found for this team. Please configure a LLM provider in Settings.');

    // 4. Appeler le LLM
    const client = createLLMClient({
      provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic',
      model: llmConfig.model,
      apiKey: decrypt(llmConfig.encryptedApiKey),
      ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
      ...(llmConfig.azureDeployment ? { azureDeployment: llmConfig.azureDeployment } : {}),
    });

    const messages = [
      { role: 'system' as const, content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: buildAnalysisUserPrompt(
          story.title,
          story.description ?? '',
          story.acceptanceCriteria,
        ),
      },
    ];

    const response = await client.complete(messages, {
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 4000,
    });

    // 5. Parser la réponse avec fallbacks robustes
    const parsed = this.parseResponse(response.content);

    // 6. Persister l'analyse
    const [created] = await db
      .insert(analyses)
      .values({
        userStoryId,
        teamId,
        scoreGlobal: parsed.scoreGlobal,
        scoreClarity: parsed.dimensions.clarity,
        scoreCompleteness: parsed.dimensions.completeness,
        scoreTestability: parsed.dimensions.testability,
        scoreEdgeCases: parsed.dimensions.edgeCases,
        scoreAcceptanceCriteria: parsed.dimensions.acceptanceCriteria,
        suggestions: parsed.suggestions,
        improvedVersion: parsed.improvedVersion || null,
        // Fix 012: champs séparés description / AC
        improvedDescription: parsed.improvedDescription ?? null,
        improvedAcceptanceCriteria: parsed.improvedAcceptanceCriteria ?? null,
        llmProvider: llmConfig.provider,
        llmModel: llmConfig.model,
        promptVersion: ANALYSIS_PROMPT_VERSION,
      })
      .returning();

    if (!created) throw new Error('Failed to persist analysis');
    return this.toResult(created);
  }

  /**
   * Parse robuste de la réponse JSON du LLM — avec fallbacks sur chaque champ.
   */
  private parseResponse(content: string): LLMAnalysisResponse {
    let raw: Record<string, unknown>;

    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      // Tenter d'extraire le JSON si le LLM a ajouté du texte autour
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('LLM response is not valid JSON');
      raw = JSON.parse(match[0]) as Record<string, unknown>;
    }

    const clamp = (v: unknown, fallback = 0): number => {
      const n = typeof v === 'number' ? v : Number(v);
      return isNaN(n) ? fallback : Math.max(0, Math.min(100, Math.round(n)));
    };

    const dims = (raw['dimensions'] ?? {}) as Record<string, unknown>;

    const clarity = clamp(dims['clarity'], 50);
    const completeness = clamp(dims['completeness'], 50);
    const testability = clamp(dims['testability'], 50);
    const edgeCases = clamp(dims['edgeCases'], 50);
    const acceptanceCriteria = clamp(dims['acceptanceCriteria'], 50);

    // Recalculer le score global si absent ou incohérent
    const computedGlobal = Math.round(
      clarity * 0.2 +
      completeness * 0.2 +
      testability * 0.25 +
      edgeCases * 0.15 +
      acceptanceCriteria * 0.2,
    );
    const scoreGlobal = clamp(raw['scoreGlobal'], computedGlobal);

    const rawSuggestions = Array.isArray(raw['suggestions']) ? raw['suggestions'] : [];
    const suggestions: AnalysisSuggestion[] = rawSuggestions
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        priority: (['critical', 'recommended', 'optional'].includes(s['priority'] as string)
          ? s['priority']
          : 'recommended') as AnalysisSuggestion['priority'],
        issue: typeof s['issue'] === 'string' ? s['issue'] : '',
        suggestion: typeof s['suggestion'] === 'string' ? s['suggestion'] : '',
      }))
      .filter((s) => s.issue && s.suggestion);

    const improvedVersion = typeof raw['improvedVersion'] === 'string' ? raw['improvedVersion'] : '';

    // Fix 012: extraire les champs séparés si le LLM les retourne
    let improvedDescription = typeof raw['improvedDescription'] === 'string' ? raw['improvedDescription'] : undefined;
    let improvedAcceptanceCriteria = typeof raw['improvedAcceptanceCriteria'] === 'string' ? raw['improvedAcceptanceCriteria'] : undefined;

    // Fallback : si le LLM retourne le format ancien (improvedVersion unique), tenter de le splitter
    if (!improvedDescription && improvedVersion) {
      const acSeparators = /\n#{1,3}\s*(?:Critères d['']acceptance|Acceptance Criteria|AC)\s*:?\n/i;
      const parts = improvedVersion.split(acSeparators);
      if (parts.length >= 2) {
        improvedDescription = parts[0]!.trim();
        improvedAcceptanceCriteria = parts.slice(1).join('\n').trim();
      }
    }

    return {
      scoreGlobal,
      dimensions: { clarity, completeness, testability, edgeCases, acceptanceCriteria },
      suggestions,
      improvedVersion,
      improvedDescription,
      improvedAcceptanceCriteria,
    };
  }

  private toResult(row: typeof analyses.$inferSelect): AnalysisResult {
    return {
      id: row.id,
      userStoryId: row.userStoryId ?? '',
      teamId: row.teamId ?? '',
      scoreGlobal: row.scoreGlobal,
      scoreClarity: row.scoreClarity,
      scoreCompleteness: row.scoreCompleteness,
      scoreTestability: row.scoreTestability,
      scoreEdgeCases: row.scoreEdgeCases,
      scoreAcceptanceCriteria: row.scoreAcceptanceCriteria,
      suggestions: row.suggestions as AnalysisSuggestion[],
      improvedVersion: row.improvedVersion,
      llmProvider: row.llmProvider,
      llmModel: row.llmModel,
      promptVersion: row.promptVersion,
      createdAt: row.createdAt,
    };
  }
}
