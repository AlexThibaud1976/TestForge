import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from 'recharts';

interface ConnectionStat {
  connectionId: string | null;
  connectionName: string | null;
  connectionType: string | null;
  averageScore: number;
  analysisCount: number;
  generationCount: number;
}

interface ProjectBreakdownProps {
  connections: ConnectionStat[];
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#EAB308';
  return '#EF4444';
}

function connIcon(type: string | null): string {
  if (type === 'jira') return '🔵';
  if (type === 'azure_devops') return '🟣';
  return '⚪';
}

export function ProjectBreakdown({ connections }: ProjectBreakdownProps) {
  if (connections.length === 0) return null;

  const sorted = [...connections].sort((a, b) => b.averageScore - a.averageScore);

  const data = sorted.map((c) => ({
    name: `${connIcon(c.connectionType)} ${c.connectionName ?? 'Non liée'}`,
    score: c.averageScore,
    label: `${c.analysisCount} analyses · ${c.generationCount} tests`,
    color: scoreColor(c.averageScore),
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Répartition par projet</h2>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 48)}>
        <BarChart data={data} layout="vertical" data-testid="bar-chart">
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12 }} />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
            <LabelList
              dataKey="score"
              position="insideRight"
              style={{ fontSize: 11, fill: '#fff', fontWeight: 600 }}
              formatter={(v: unknown) => `${String(v)}/100`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Annotations texte */}
      <div className="mt-3 space-y-1.5">
        {sorted.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-xs text-gray-500">
            <span>{connIcon(c.connectionType)} {c.connectionName ?? 'Non liée'}</span>
            <span>{c.analysisCount} analyse{c.analysisCount !== 1 ? 's' : ''} · {c.generationCount} test{c.generationCount !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
