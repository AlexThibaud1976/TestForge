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
  status: string;
  progressStep: string | null;
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
   * Vérifie le cache et retourne l'analyse existante, ou null.
   */
  async analyzeWithCache(userStoryId: string, teamId: string): Promise<AnalysisResult | null> {
    const story = await db.query.userStories.findFirst({
      where: and(eq(userStories.id, userStoryId), eq(userStories.teamId, teamId)),
    });
    if (!story) throw new Error('User story not found');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cached = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.userStoryId, userStoryId),
        eq(analyses.teamId, teamId),
        eq(analyses.status, 'success'),
        gt(analyses.createdAt, oneDayAgo),
      ),
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    if (cached && cached.createdAt >= story.fetchedAt) {
      return this.toResult(cached);
    }
    return null;
  }

  /**
   * Insère un enregistrement analyses en statut 'pending' et le retourne.
   */
  async createPending(userStoryId: string, teamId: string): Promise<{ id: string; status: string }> {
    const [row] = await db
      .insert(analyses)
      .values({
        userStoryId,
        teamId,
        status: 'pending',
        progressStep: null,
        scoreGlobal: 0,
        scoreClarity: 0,
        scoreCompleteness: 0,
        scoreTestability: 0,
        scoreEdgeCases: 0,
        scoreAcceptanceCriteria: 0,
        suggestions: [],
        llmProvider: '',
        llmModel: '',
        promptVersion: '',
      })
      .returning();

    if (!row) throw new Error('Failed to create pending analysis');
    return { id: row.id, status: 'pending' };
  }

  /**
   * Traite l'analyse en arrière-plan avec 3 updates DB intermédiaires
   * → Supabase Realtime notifie le frontend à chaque étape.
   */
  async processAnalysis(analysisId: string, userStoryId: string, teamId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Étape 1 : Préparation
      await db.update(analyses).set({ progressStep: 'preparing' }).where(eq(analyses.id, analysisId));

      const story = await db.query.userStories.findFirst({
        where: and(eq(userStories.id, userStoryId), eq(userStories.teamId, teamId)),
      });
      if (!story) throw new Error('User story not found');

      const llmConfig = await db.query.llmConfigs.findFirst({
        where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
      });
      if (!llmConfig) throw new Error('No default LLM configuration found for this team. Please configure a LLM provider in Settings.');

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

      // Étape 2 : Appel LLM
      await db.update(analyses).set({ progressStep: 'calling_llm' }).where(eq(analyses.id, analysisId));

      const response = await client.complete(messages, {
        temperature: 0.2,
        jsonMode: true,
        maxTokens: 4000,
      });

      // Étape 3 : Finalisation (parsing + scores)
      await db.update(analyses).set({ progressStep: 'finalizing' }).where(eq(analyses.id, analysisId));

      const parsed = this.parseResponse(response.content);

      // Étape 4 : Persistance du résultat final
      await db.update(analyses).set({
        status: 'success',
        progressStep: null,
        durationMs: Date.now() - startTime,
        scoreGlobal: parsed.scoreGlobal,
        scoreClarity: parsed.dimensions.clarity,
        scoreCompleteness: parsed.dimensions.completeness,
        scoreTestability: parsed.dimensions.testability,
        scoreEdgeCases: parsed.dimensions.edgeCases,
        scoreAcceptanceCriteria: parsed.dimensions.acceptanceCriteria,
        suggestions: parsed.suggestions,
        improvedVersion: parsed.improvedVersion || null,
        improvedDescription: parsed.improvedDescription ?? null,
        improvedAcceptanceCriteria: parsed.improvedAcceptanceCriteria ?? null,
        llmProvider: llmConfig.provider,
        llmModel: llmConfig.model,
        promptVersion: ANALYSIS_PROMPT_VERSION,
      }).where(eq(analyses.id, analysisId));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      await db
        .update(analyses)
        .set({ status: 'error', progressStep: null, durationMs: Date.now() - startTime, llmProvider: '', llmModel: '', promptVersion: '' })
        .where(eq(analyses.id, analysisId))
        .catch(() => undefined);
      throw new Error(message);
    }
  }

  /**
   * Retourne l'analyse par ID.
   */
  async getById(analysisId: string, teamId: string): Promise<AnalysisResult | null> {
    const row = await db.query.analyses.findFirst({
      where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
    });
    return row ? this.toResult(row) : null;
  }

  /**
   * Wrapper synchrone utilisé par le batch — cache check → createPending → processAnalysis → getById.
   */
  async analyze(userStoryId: string, teamId: string): Promise<AnalysisResult> {
    const cached = await this.analyzeWithCache(userStoryId, teamId);
    if (cached) return cached;

    const { id } = await this.createPending(userStoryId, teamId);
    await this.processAnalysis(id, userStoryId, teamId);

    const result = await this.getById(id, teamId);
    if (!result) throw new Error('Failed to retrieve analysis after processing');
    return result;
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
      const acSeparators = /\n#{1,3}\s*(?:Critères d['']acceptation|Acceptance Criteria|AC)\s*:?\n/i;
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
      status: row.status,
      progressStep: row.progressStep,
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
