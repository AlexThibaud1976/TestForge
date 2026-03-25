import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface AnalysisResultItem {
  userStoryId: string;
  analysis: {
    id: string;
    scoreGlobal: number;
    scoreClarity: number;
    scoreCompleteness: number;
    scoreTestability: number;
    scoreEdgeCases: number;
    scoreAcceptanceCriteria: number;
    llmProvider: string;
  } | null;
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

interface StoryMeta {
  id: string;
  externalId: string;
  title: string;
}

interface Props {
  results: AnalysisResultItem[];
  stats: BatchStats;
  stories: StoryMeta[];
}

type SortKey = 'score' | 'clarity' | 'completeness' | 'testability' | 'edgeCases' | 'ac';

const SCORE_COLOR = (s: number) =>
  s < 40 ? 'text-red-600 bg-red-50' : s <= 70 ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';

const SCORE_BAR = (s: number) =>
  s < 40 ? 'bg-red-400' : s <= 70 ? 'bg-yellow-400' : 'bg-green-400';

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${SCORE_BAR(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums w-7">{value}</span>
    </div>
  );
}

export function SprintScoreboard({ results, stats, stories }: Props) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(true);

  const storyMap = new Map(stories.map((s) => [s.id, s]));

  const rows = results
    .filter((r) => r.analysis !== null)
    .map((r) => ({
      ...r,
      story: storyMap.get(r.userStoryId),
      analysis: r.analysis!,
    }));

  const sortedRows = [...rows].sort((a, b) => {
    const getValue = (row: typeof a) => {
      switch (sortKey) {
        case 'score': return row.analysis.scoreGlobal;
        case 'clarity': return row.analysis.scoreClarity;
        case 'completeness': return row.analysis.scoreCompleteness;
        case 'testability': return row.analysis.scoreTestability;
        case 'edgeCases': return row.analysis.scoreEdgeCases;
        case 'ac': return row.analysis.scoreAcceptanceCriteria;
      }
    };
    return sortAsc ? getValue(a) - getValue(b) : getValue(b) - getValue(a);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSort(key, !sortAsc);
    else setSort(key, true);
  };
  const setSort = (key: SortKey, asc: boolean) => { setSortKey(key); setSortAsc(asc); };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-xs font-medium uppercase tracking-wide hover:text-gray-900 flex items-center gap-0.5 ${sortKey === k ? 'text-indigo-600' : 'text-gray-400'}`}
    >
      {label}
      {sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </button>
  );

  const handleExportCSV = () => {
    const header = ['Titre', 'ExternalId', 'Score', 'Clarté', 'Complétude', 'Testabilité', 'Edge Cases', 'AC'];
    const csvRows = sortedRows.map((r) => [
      `"${r.story?.title ?? r.userStoryId}"`,
      r.story?.externalId ?? '',
      r.analysis.scoreGlobal,
      r.analysis.scoreClarity,
      r.analysis.scoreCompleteness,
      r.analysis.scoreTestability,
      r.analysis.scoreEdgeCases,
      r.analysis.scoreAcceptanceCriteria,
    ]);
    const csv = [header, ...csvRows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sprint-scores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      {/* Header stats */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.meanScore !== null ? `${stats.meanScore}/100` : '—'}
            </div>
            <div className="text-xs text-gray-400">Score moyen du sprint</div>
          </div>
          <div className="flex gap-2">
            {stats.distribution.red > 0 && (
              <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full font-medium">
                {stats.distribution.red} rouge{stats.distribution.red > 1 ? 's' : ''}
              </span>
            )}
            {stats.distribution.orange > 0 && (
              <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full font-medium">
                {stats.distribution.orange} orange{stats.distribution.orange > 1 ? 's' : ''}
              </span>
            )}
            {stats.distribution.green > 0 && (
              <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full font-medium">
                {stats.distribution.green} vert{stats.distribution.green > 1 ? 's' : ''}
              </span>
            )}
            {stats.fromCache > 0 && (
              <span className="text-xs px-2 py-1 bg-gray-50 text-gray-400 rounded-full">
                {stats.fromCache} en cache
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleExportCSV}
          className="text-sm border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
        >
          ↓ CSV
        </button>
      </div>

      {/* Failed items */}
      {results.filter((r) => r.error).map((r) => (
        <div key={r.userStoryId} className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600">
          ❌ {storyMap.get(r.userStoryId)?.title ?? r.userStoryId} — {r.error}
        </div>
      ))}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">US</th>
              <th className="px-4 py-3"><SortHeader label="Score" k="score" /></th>
              <th className="px-4 py-3"><SortHeader label="Clarté" k="clarity" /></th>
              <th className="px-4 py-3"><SortHeader label="Complétude" k="completeness" /></th>
              <th className="px-4 py-3"><SortHeader label="Testabilité" k="testability" /></th>
              <th className="px-4 py-3"><SortHeader label="Edge Cases" k="edgeCases" /></th>
              <th className="px-4 py-3"><SortHeader label="AC" k="ac" /></th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedRows.map((row) => (
              <tr
                key={row.userStoryId}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => void navigate(`/stories/${row.userStoryId}`)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{row.story?.externalId}</span>
                    <span className="text-sm text-gray-800 truncate max-w-xs">{row.story?.title ?? row.userStoryId}</span>
                    {row.fromCache && <span className="text-xs text-gray-300">cache</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${SCORE_COLOR(row.analysis.scoreGlobal)}`}>
                    {row.analysis.scoreGlobal}
                  </span>
                </td>
                <td className="px-4 py-3"><ScoreBar value={row.analysis.scoreClarity} /></td>
                <td className="px-4 py-3"><ScoreBar value={row.analysis.scoreCompleteness} /></td>
                <td className="px-4 py-3"><ScoreBar value={row.analysis.scoreTestability} /></td>
                <td className="px-4 py-3"><ScoreBar value={row.analysis.scoreEdgeCases} /></td>
                <td className="px-4 py-3"><ScoreBar value={row.analysis.scoreAcceptanceCriteria} /></td>
                <td className="px-4 py-3 text-gray-300 text-xs">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
