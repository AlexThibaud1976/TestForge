import pLimit from 'p-limit';
import { AnalysisService, type AnalysisResult } from './AnalysisService.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BatchResultItem {
  userStoryId: string;
  analysis: AnalysisResult | null;
  fromCache: boolean;
  error: string | null;
}

export interface BatchStats {
  total: number;
  succeeded: number;
  failed: number;
  fromCache: number;
  meanScore: number | null;
  distribution: { red: number; orange: number; green: number };
}

export interface BatchResult {
  results: BatchResultItem[];
  stats: BatchStats;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class BatchAnalysisService {
  private analysisService: AnalysisService;

  constructor(analysisService?: AnalysisService) {
    this.analysisService = analysisService ?? new AnalysisService();
  }

  async analyzeBatch(userStoryIds: string[], teamId: string): Promise<BatchResult> {
    if (userStoryIds.length === 0) {
      throw new Error('At least one userStoryId is required');
    }

    const limit = pLimit(3); // max 3 LLM calls simultanés

    // Lancer toutes les analyses en parallèle (max 3 simultanées)
    const settled = await Promise.allSettled(
      userStoryIds.map((id) =>
        limit(async () => {
          const createdAtBefore = Date.now();
          const analysis = await this.analysisService.analyze(id, teamId);
          const elapsed = Date.now() - createdAtBefore;
          // Cache hit = réponse en < 100ms (AnalysisService retourne le cache immédiatement)
          const fromCache = elapsed < 100;
          return { userStoryId: id, analysis, fromCache };
        }),
      ),
    );

    const results: BatchResultItem[] = settled.map((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        return {
          userStoryId: outcome.value.userStoryId,
          analysis: outcome.value.analysis,
          fromCache: outcome.value.fromCache,
          error: null,
        };
      }
      return {
        userStoryId: userStoryIds[i]!,
        analysis: null,
        fromCache: false,
        error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      };
    });

    // ── Stats ────────────────────────────────────────────────────────────────

    const succeeded = results.filter((r) => r.analysis !== null);
    const failed = results.filter((r) => r.analysis === null);
    const fromCache = results.filter((r) => r.fromCache).length;
    const scores = succeeded.map((r) => r.analysis!.scoreGlobal);

    const meanScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

    const distribution = {
      red: scores.filter((s) => s < 40).length,
      orange: scores.filter((s) => s >= 40 && s <= 70).length,
      green: scores.filter((s) => s > 70).length,
    };

    return {
      results,
      stats: {
        total: userStoryIds.length,
        succeeded: succeeded.length,
        failed: failed.length,
        fromCache,
        meanScore,
        distribution,
      },
    };
  }
}
