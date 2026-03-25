import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../lib/api.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsMetrics {
  period: { from: string; to: string };
  counts: { analyses: number; generations: number; manualTestSets: number; manualTestCases: number };
  timeSaved: {
    totalMinutes: number;
    breakdown: { analyses: number; generations: number; manualTests: number };
    coefficients: { analysis: number; generation: number; manualTest: number };
  };
  scoreTrend: Array<{ week: string; meanScore: number; count: number }>;
  distribution: { frameworks: Record<string, number>; llmProviders: Record<string, number> };
  highlights: {
    bestScoredUS: { id: string; title: string; score: number } | null;
    worstScoredUS: { id: string; title: string; score: number } | null;
    scoreTrendPercent: number | null;
  };
}

type Period = 'month' | 'quarter' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Ce mois',
  quarter: 'Ce trimestre',
  all: 'Tout le temps',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#4f46e5', '#7c3aed'];

function minutesToReadable(mins: number): string {
  if (mins < 60) return `~${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h${m}` : `~${h}h`;
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-indigo-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('month');
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config coefficients (Phase 3)
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({ analysisMinutes: 30, generationMinutes: 90, manualTestMinutes: 45 });
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<AnalyticsMetrics>(`/api/analytics?period=${period}`)
      .then((data) => {
        setMetrics(data);
        setConfigForm({
          analysisMinutes: data.timeSaved.coefficients.analysis,
          generationMinutes: data.timeSaved.coefficients.generation,
          manualTestMinutes: data.timeSaved.coefficients.manualTest,
        });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const isEmpty = metrics && metrics.counts.analyses === 0 && metrics.counts.generations === 0;

  const frameworkData = metrics
    ? Object.entries(metrics.distribution.frameworks).map(([name, value]) => ({ name, value }))
    : [];

  const providerData = metrics
    ? Object.entries(metrics.distribution.llmProviders).map(([name, value]) => ({ name, value }))
    : [];

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.patch('/api/analytics/config', configForm);
      setEditingConfig(false);
      load();
    } catch {
      // ignore
    } finally {
      setSavingConfig(false);
    }
  };

  const handleExport = () => {
    if (!metrics) return;
    const rows = [
      ['Période', metrics.period.from, metrics.period.to],
      [''],
      ['Métrique', 'Valeur'],
      ['Analyses', metrics.counts.analyses],
      ['Générations', metrics.counts.generations],
      ['Tests manuels (lots)', metrics.counts.manualTestSets],
      ['Tests manuels (cas)', metrics.counts.manualTestCases],
      ['Temps gagné (min)', metrics.timeSaved.totalMinutes],
      ['Temps gagné (h)', Math.round(metrics.timeSaved.totalMinutes / 60 * 10) / 10],
      [''],
      ['Semaine', 'Score moyen', 'Nb analyses'],
      ...metrics.scoreTrend.map((r) => [r.week, r.meanScore, r.count]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testforge-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics & ROI</h1>
          <p className="text-sm text-gray-500 mt-0.5">Métriques d'utilisation et temps gagné</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={!metrics || isEmpty === true}
            className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400 text-center py-12">Chargement...</div>}
      {error && <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">Erreur : {error}</div>}

      {!loading && isEmpty && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm font-medium text-gray-500">Pas encore d'activité {period === 'month' ? 'ce mois' : 'sur cette période'}</p>
          <button
            onClick={() => void navigate('/stories')}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 underline"
          >
            Analyser vos premières US →
          </button>
        </div>
      )}

      {!loading && metrics && !isEmpty && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard value={metrics.counts.analyses} label="Analyses" />
            <MetricCard value={metrics.counts.generations} label="Générations" />
            <MetricCard value={metrics.counts.manualTestSets} label="Tests manuels" />
            <MetricCard
              value={minutesToReadable(metrics.timeSaved.totalMinutes)}
              label="Temps gagné"
              sub={`${metrics.counts.analyses} analyses + ${metrics.counts.generations} générat.`}
            />
          </div>

          {/* Score trend */}
          {metrics.scoreTrend.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Score moyen par semaine</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${String(value)}/100`, 'Score moyen']}
                    labelFormatter={(label) => `Semaine du ${String(label)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="meanScore"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {frameworkData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Frameworks générés</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={frameworkData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                      {frameworkData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {providerData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Providers LLM</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}>
                      {providerData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Highlights */}
          {(metrics.highlights.bestScoredUS || metrics.highlights.worstScoredUS || metrics.highlights.scoreTrendPercent !== null) && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Points clés</h2>
              <div className="space-y-2">
                {metrics.highlights.scoreTrendPercent !== null && (
                  <p className={`text-sm ${metrics.highlights.scoreTrendPercent >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {metrics.highlights.scoreTrendPercent >= 0 ? '✓' : '↓'} Score{' '}
                    {metrics.highlights.scoreTrendPercent >= 0 ? 'en hausse' : 'en baisse'} de{' '}
                    {metrics.highlights.scoreTrendPercent > 0 ? '+' : ''}{metrics.highlights.scoreTrendPercent}% vs période précédente
                  </p>
                )}
                {metrics.highlights.bestScoredUS && (
                  <p className="text-sm text-gray-600">
                    🏆 Meilleure US : <span className="font-medium">{metrics.highlights.bestScoredUS.title}</span> — {metrics.highlights.bestScoredUS.score}/100
                  </p>
                )}
                {metrics.highlights.worstScoredUS && (
                  <p className="text-sm text-gray-600">
                    ⚠️ US à améliorer : <span className="font-medium">{metrics.highlights.worstScoredUS.title}</span> — {metrics.highlights.worstScoredUS.score}/100
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Config coefficients (Phase 3) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Paramètres d'estimation du temps</h2>
              <button
                onClick={() => setEditingConfig(!editingConfig)}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                {editingConfig ? 'Annuler' : '⚙ Modifier'}
              </button>
            </div>
            {editingConfig ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'analysisMinutes' as const, label: 'Par analyse (min)' },
                    { key: 'generationMinutes' as const, label: 'Par génération (min)' },
                    { key: 'manualTestMinutes' as const, label: 'Par test manuel (min)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        min={1}
                        max={1440}
                        value={configForm[key]}
                        onChange={(e) => setConfigForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => void handleSaveConfig()}
                  disabled={savingConfig}
                  className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingConfig ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            ) : (
              <div className="flex gap-6 text-sm text-gray-500">
                <span>Analyse : <b className="text-gray-700">{metrics.timeSaved.coefficients.analysis}min</b></span>
                <span>Génération : <b className="text-gray-700">{metrics.timeSaved.coefficients.generation}min</b></span>
                <span>Test manuel : <b className="text-gray-700">{metrics.timeSaved.coefficients.manualTest}min</b></span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
