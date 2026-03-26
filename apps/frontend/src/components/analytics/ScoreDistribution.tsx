import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ScoreDistributionProps {
  distribution: { green: number; yellow: number; red: number };
  averageScore: number;
}

const COLORS = { green: '#22C55E', yellow: '#EAB308', red: '#EF4444' };

export function ScoreDistribution({ distribution, averageScore }: ScoreDistributionProps) {
  const total = distribution.green + distribution.yellow + distribution.red;

  const data = [
    { name: 'Bon (≥70)', value: distribution.green, color: COLORS.green },
    { name: 'Moyen (40-69)', value: distribution.yellow, color: COLORS.yellow },
    { name: 'Faible (<40)', value: distribution.red, color: COLORS.red },
  ].filter((d) => d.value > 0);

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribution des scores</h2>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length > 0 ? data : [{ name: 'Vide', value: 1, color: '#e5e7eb' }]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                strokeWidth={0}
              >
                {data.length > 0
                  ? data.map((entry, i) => <Cell key={i} fill={entry.color} />)
                  : <Cell fill="#e5e7eb" />}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Label central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span data-testid="center-score" className="text-2xl font-bold text-gray-900">
              {averageScore}
            </span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>

        {/* Légende */}
        <div className="space-y-2 text-sm flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <span className="text-gray-600">Bons</span>
            <span data-testid="green-count" className="ml-auto font-medium">{distribution.green}</span>
            <span className="text-gray-400 text-xs">({pct(distribution.green)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shrink-0" />
            <span className="text-gray-600">Moyens</span>
            <span data-testid="yellow-count" className="ml-auto font-medium">{distribution.yellow}</span>
            <span className="text-gray-400 text-xs">({pct(distribution.yellow)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <span className="text-gray-600">Faibles</span>
            <span data-testid="red-count" className="ml-auto font-medium">{distribution.red}</span>
            <span className="text-gray-400 text-xs">({pct(distribution.red)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
