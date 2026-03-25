import { sql, eq, and, gte, desc, asc, count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, generations, manualTestSets, manualTestCases, teams, userStories } from '../../db/schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimeSavedBreakdown {
  analyses: number;
  generations: number;
  manualTests: number;
}

export interface AnalyticsCoefficients {
  analysis: number;
  generation: number;
  manualTest: number;
}

export interface AnalyticsMetrics {
  period: { from: string; to: string };
  counts: {
    analyses: number;
    generations: number;
    manualTestSets: number;
    manualTestCases: number;
  };
  timeSaved: {
    totalMinutes: number;
    breakdown: TimeSavedBreakdown;
    coefficients: AnalyticsCoefficients;
  };
  scoreTrend: Array<{ week: string; meanScore: number; count: number }>;
  distribution: {
    frameworks: Record<string, number>;
    llmProviders: Record<string, number>;
  };
  highlights: {
    bestScoredUS: { id: string; title: string; score: number } | null;
    worstScoredUS: { id: string; title: string; score: number } | null;
    scoreTrendPercent: number | null;
  };
}

const DEFAULT_COEFFICIENTS: AnalyticsCoefficients = {
  analysis: 30,
  generation: 90,
  manualTest: 45,
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class AnalyticsService {
  async getMetrics(teamId: string, period: 'month' | 'quarter' | 'all'): Promise<AnalyticsMetrics> {
    const now = new Date();
    const periodStart = this.getPeriodStart(period, now);
    const prevPeriodStart = period !== 'all' ? this.getPeriodStart(period, periodStart) : null;

    // Charger les coefficients de l'équipe
    const [team] = await db.select({ coefficients: teams.analyticsCoefficients }).from(teams).where(eq(teams.id, teamId)).limit(1);
    const coefficients: AnalyticsCoefficients = {
      ...DEFAULT_COEFFICIENTS,
      ...((team?.coefficients as Partial<AnalyticsCoefficients> | null) ?? {}),
    };

    // ── Counts ──────────────────────────────────────────────────────────────

    const [analysisCountRow] = await db
      .select({ count: count() })
      .from(analyses)
      .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, periodStart)));

    const [generationCountRow] = await db
      .select({ count: count() })
      .from(generations)
      .where(and(eq(generations.teamId, teamId), gte(generations.createdAt, periodStart)));

    const [manualSetCountRow] = await db
      .select({ count: count() })
      .from(manualTestSets)
      .where(and(eq(manualTestSets.teamId, teamId), gte(manualTestSets.createdAt, periodStart)));

    const [manualCaseCountRow] = await db
      .select({ count: count() })
      .from(manualTestCases)
      .where(and(eq(manualTestCases.teamId, teamId), gte(manualTestCases.createdAt, periodStart)));

    const analysisCount = analysisCountRow?.count ?? 0;
    const generationCount = generationCountRow?.count ?? 0;
    const manualSetCount = manualSetCountRow?.count ?? 0;
    const manualCaseCount = manualCaseCountRow?.count ?? 0;

    // ── Temps gagné ──────────────────────────────────────────────────────────

    const analysisMins = analysisCount * coefficients.analysis;
    const generationMins = generationCount * coefficients.generation;
    const manualMins = manualSetCount * coefficients.manualTest;

    // ── Score trend ──────────────────────────────────────────────────────────

    const trendRows = await db.execute<{ week: Date; mean_score: number; count: number }>(sql`
      SELECT
        date_trunc('week', created_at) AS week,
        ROUND(AVG(score_global))::int  AS mean_score,
        COUNT(*)::int                  AS count
      FROM analyses
      WHERE team_id = ${teamId}
        AND created_at >= ${periodStart.toISOString()}
      GROUP BY week
      ORDER BY week
    `);

    const scoreTrend = Array.from(trendRows).map((r) => ({
      week: new Date((r as { week: Date; mean_score: number; count: number }).week).toISOString().slice(0, 10),
      meanScore: Number((r as { week: Date; mean_score: number; count: number }).mean_score),
      count: Number((r as { week: Date; mean_score: number; count: number }).count),
    }));

    // ── Distribution frameworks ───────────────────────────────────────────────

    const frameworkRows = await db
      .select({
        key: sql<string>`${generations.framework} || '+' || ${generations.language}`,
        count: count(),
      })
      .from(generations)
      .where(and(eq(generations.teamId, teamId), gte(generations.createdAt, periodStart)))
      .groupBy(sql`${generations.framework} || '+' || ${generations.language}`);

    const frameworkDist: Record<string, number> = {};
    for (const r of frameworkRows) {
      if (r.key) frameworkDist[r.key] = r.count;
    }

    // ── Distribution LLM providers ────────────────────────────────────────────

    const providerRows = await db
      .select({ key: analyses.llmProvider, count: count() })
      .from(analyses)
      .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, periodStart)))
      .groupBy(analyses.llmProvider);

    const providerDist: Record<string, number> = {};
    for (const r of providerRows) {
      if (r.key) providerDist[r.key] = r.count;
    }

    // ── Highlights ────────────────────────────────────────────────────────────

    const bestRow = await db
      .select({ id: userStories.id, title: userStories.title, score: analyses.scoreGlobal })
      .from(analyses)
      .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
      .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, periodStart)))
      .orderBy(desc(analyses.scoreGlobal))
      .limit(1);

    const worstRow = await db
      .select({ id: userStories.id, title: userStories.title, score: analyses.scoreGlobal })
      .from(analyses)
      .innerJoin(userStories, eq(analyses.userStoryId, userStories.id))
      .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, periodStart)))
      .orderBy(asc(analyses.scoreGlobal))
      .limit(1);

    // Score trend percent (vs période précédente)
    let scoreTrendPercent: number | null = null;
    if (prevPeriodStart) {
      const currentAvgResult = await db.execute<{ avg: number }>(sql`
        SELECT ROUND(AVG(score_global)) AS avg FROM analyses
        WHERE team_id = ${teamId} AND created_at >= ${periodStart.toISOString()}
      `);
      const prevAvgResult = await db.execute<{ avg: number }>(sql`
        SELECT ROUND(AVG(score_global)) AS avg FROM analyses
        WHERE team_id = ${teamId}
          AND created_at >= ${prevPeriodStart.toISOString()}
          AND created_at < ${periodStart.toISOString()}
      `);
      const currentAvg = Number((Array.from(currentAvgResult)[0] as { avg: number } | undefined)?.avg ?? 0);
      const prevAvg = Number((Array.from(prevAvgResult)[0] as { avg: number } | undefined)?.avg ?? 0);
      if (prevAvg > 0) {
        scoreTrendPercent = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
      }
    }

    return {
      period: { from: periodStart.toISOString(), to: now.toISOString() },
      counts: {
        analyses: analysisCount,
        generations: generationCount,
        manualTestSets: manualSetCount,
        manualTestCases: manualCaseCount,
      },
      timeSaved: {
        totalMinutes: analysisMins + generationMins + manualMins,
        breakdown: { analyses: analysisMins, generations: generationMins, manualTests: manualMins },
        coefficients,
      },
      scoreTrend,
      distribution: { frameworks: frameworkDist, llmProviders: providerDist },
      highlights: {
        bestScoredUS: bestRow[0] ? { id: bestRow[0].id, title: bestRow[0].title, score: bestRow[0].score } : null,
        worstScoredUS: worstRow[0] ? { id: worstRow[0].id, title: worstRow[0].title, score: worstRow[0].score } : null,
        scoreTrendPercent,
      },
    };
  }

  private getPeriodStart(period: 'month' | 'quarter' | 'all', from: Date): Date {
    const d = new Date(from);
    if (period === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (period === 'quarter') {
      d.setMonth(d.getMonth() - 3);
    } else {
      d.setFullYear(2000); // "all time"
    }
    return d;
  }
}
