import { Card, CardContent } from '@/components/ui/card.js';
import { Button } from '@/components/ui/button.js';

interface KpiCardsProps {
  averageScore: number;
  totalAnalyses: number;
  totalGenerations: number;
  timeSavedMinutes: number;
  manualTestMinutes: number;
  onEditEstimate: () => void;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function formatTimeSaved(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function KpiCards({
  averageScore,
  totalAnalyses,
  totalGenerations,
  timeSavedMinutes,
  manualTestMinutes,
  onEditEstimate,
}: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Score moyen */}
      <Card>
        <CardContent className="p-5">
          <div
            data-testid="score-badge"
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-2xl font-bold border ${scoreColor(averageScore)}`}
          >
            {averageScore}
          </div>
          <div className="text-sm text-gray-500 mt-2">Score moyen</div>
          <div className="text-xs text-gray-400">/100</div>
        </CardContent>
      </Card>

      {/* Analyses */}
      <Card>
        <CardContent className="p-5">
          <div className="text-3xl font-bold text-gray-900">{totalAnalyses}</div>
          <div className="text-sm text-gray-500 mt-1">Analyses</div>
        </CardContent>
      </Card>

      {/* Générations */}
      <Card>
        <CardContent className="p-5">
          <div className="text-3xl font-bold text-gray-900">{totalGenerations}</div>
          <div className="text-sm text-gray-500 mt-1">Tests générés</div>
        </CardContent>
      </Card>

      {/* Temps économisé */}
      <Card>
        <CardContent className="p-5">
          <div className="text-3xl font-bold text-gray-900">{formatTimeSaved(timeSavedMinutes)}</div>
          <div className="text-sm text-gray-500 mt-1">Temps économisé</div>
          <Button
            variant="ghost"
            size="xs"
            onClick={onEditEstimate}
            className="text-xs text-gray-400 hover:text-gray-600 mt-0.5 flex items-center gap-1 px-0"
          >
            <span>({manualTestMinutes} min/test)</span>
            <span>⚙️</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
