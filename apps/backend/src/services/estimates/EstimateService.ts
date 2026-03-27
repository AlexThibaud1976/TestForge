import { eq, and, isNotNull, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, generations } from '../../db/schema.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DurationEstimate {
  estimatedMs: number;
  sampleSize: number;
  source: 'team' | 'global' | 'default';
}

const DEFAULT_ESTIMATES: Record<'analysis' | 'generation', number> = {
  analysis: 15000,
  generation: 25000,
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class EstimateService {
  /**
   * Calcule l'estimation de durée basée sur l'historique.
   * Priorité : team (≥5 entrées) > global (≥5 entrées) > default.
   */
  async getEstimate(
    type: 'analysis' | 'generation',
    provider: string,
    model: string,
    teamId: string,
  ): Promise<DurationEstimate> {
    if (type === 'analysis') {
      return this.estimateFromAnalyses(provider, model, teamId);
    }
    return this.estimateFromGenerations(provider, model, teamId);
  }

  private async estimateFromAnalyses(
    provider: string,
    model: string,
    teamId: string,
  ): Promise<DurationEstimate> {
    // Requête team
    const teamRows = await db
      .select({ durationMs: analyses.durationMs })
      .from(analyses)
      .where(
        and(
          eq(analyses.teamId, teamId),
          eq(analyses.status, 'success'),
          eq(analyses.llmProvider, provider),
          eq(analyses.llmModel, model),
          isNotNull(analyses.durationMs),
        ),
      )
      .orderBy(desc(analyses.createdAt))
      .limit(20);

    const teamDurations = teamRows.map((r) => r.durationMs as number);

    if (teamDurations.length >= 5) {
      return { estimatedMs: median(teamDurations), sampleSize: teamDurations.length, source: 'team' };
    }

    // Requête global (tous les teams)
    const globalRows = await db
      .select({ durationMs: analyses.durationMs })
      .from(analyses)
      .where(
        and(
          eq(analyses.status, 'success'),
          eq(analyses.llmProvider, provider),
          eq(analyses.llmModel, model),
          isNotNull(analyses.durationMs),
        ),
      )
      .orderBy(desc(analyses.createdAt))
      .limit(20);

    const globalDurations = globalRows.map((r) => r.durationMs as number);

    if (globalDurations.length >= 5) {
      return { estimatedMs: median(globalDurations), sampleSize: globalDurations.length, source: 'global' };
    }

    return { estimatedMs: DEFAULT_ESTIMATES.analysis, sampleSize: 0, source: 'default' };
  }

  private async estimateFromGenerations(
    provider: string,
    model: string,
    teamId: string,
  ): Promise<DurationEstimate> {
    // Requête team
    const teamRows = await db
      .select({ durationMs: generations.durationMs })
      .from(generations)
      .where(
        and(
          eq(generations.teamId, teamId),
          eq(generations.status, 'success'),
          eq(generations.llmProvider, provider),
          eq(generations.llmModel, model),
          isNotNull(generations.durationMs),
        ),
      )
      .orderBy(desc(generations.createdAt))
      .limit(20);

    const teamDurations = teamRows.map((r) => r.durationMs as number);

    if (teamDurations.length >= 5) {
      return { estimatedMs: median(teamDurations), sampleSize: teamDurations.length, source: 'team' };
    }

    // Requête global
    const globalRows = await db
      .select({ durationMs: generations.durationMs })
      .from(generations)
      .where(
        and(
          eq(generations.status, 'success'),
          eq(generations.llmProvider, provider),
          eq(generations.llmModel, model),
          isNotNull(generations.durationMs),
        ),
      )
      .orderBy(desc(generations.createdAt))
      .limit(20);

    const globalDurations = globalRows.map((r) => r.durationMs as number);

    if (globalDurations.length >= 5) {
      return { estimatedMs: median(globalDurations), sampleSize: globalDurations.length, source: 'global' };
    }

    return { estimatedMs: DEFAULT_ESTIMATES.generation, sampleSize: 0, source: 'default' };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] as number)
    : Math.round(((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2);
}
