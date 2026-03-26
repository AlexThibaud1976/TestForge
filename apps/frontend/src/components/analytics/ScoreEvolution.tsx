import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ScoreEvolutionProps {
  weeklyScores: Array<{ week: string; averageScore: number; count: number }>;
}

export function ScoreEvolution({ weeklyScores }: ScoreEvolutionProps) {
  const data = weeklyScores.map((w) => ({
    name: w.week.replace(/^(\d{4})-W/, 'S'),
    score: w.averageScore,
    count: w.count,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Évolution hebdomadaire</h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Pas encore de données</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} data-testid="line-chart">
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, _name, props: { payload?: { count?: number } }) => [
                `${String(value)}/100 (${String(props.payload?.count ?? 0)} analyses)`,
                'Score moyen',
              ]}
              labelFormatter={(label) => `Semaine ${String(label)}`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
