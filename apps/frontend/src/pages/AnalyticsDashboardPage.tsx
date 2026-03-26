import { useState } from 'react';
import { useConnectionFilter } from '../hooks/useConnectionFilter.js';
import { useAnalyticsData } from '../hooks/useAnalyticsData.js';
import { KpiCards } from '../components/analytics/KpiCards.js';
import { ScoreDistribution } from '../components/analytics/ScoreDistribution.js';
import { ScoreEvolution } from '../components/analytics/ScoreEvolution.js';
import { ProjectBreakdown } from '../components/analytics/ProjectBreakdown.js';
import { TimeEstimateConfig } from '../components/analytics/TimeEstimateConfig.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { Alert, AlertDescription } from '@/components/ui/alert.js';

export function AnalyticsDashboardPage() {
  const { connections, connectionId, setConnectionId } = useConnectionFilter();
  const { data, loading, error, refetch } = useAnalyticsData(connectionId);
  const [editingEstimate, setEditingEstimate] = useState(false);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header + filtre */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble qualité & ROI</p>
        </div>
        {connections.length > 0 && (
          <select
            value={connectionId ?? ''}
            onChange={(e) => setConnectionId(e.target.value || null)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les projets</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 'jira' ? '🔵' : '🟣'} {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && <Skeleton className="h-8 w-48" />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Erreur : {error}</AlertDescription>
        </Alert>
      )}

      {!loading && data && (
        <>
          {/* KPI Cards */}
          <KpiCards
            {...data.kpis}
            onEditEstimate={() => setEditingEstimate(true)}
          />

          {/* Config temps estimé (inline, conditionnel) */}
          {editingEstimate && (
            <TimeEstimateConfig
              currentValue={data.kpis.manualTestMinutes}
              onSave={() => { setEditingEstimate(false); refetch(); }}
              onCancel={() => setEditingEstimate(false)}
            />
          )}

          {/* Charts : Distribution (gauche) + Évolution (droite) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <ScoreDistribution
              distribution={data.distribution}
              averageScore={data.kpis.averageScore}
            />
            <ScoreEvolution weeklyScores={data.weeklyScores} />
          </div>

          {/* Répartition par projet (pleine largeur) */}
          <ProjectBreakdown connections={data.byConnection} />
        </>
      )}

      {!loading && !error && !data && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm">Aucune donnée disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}
