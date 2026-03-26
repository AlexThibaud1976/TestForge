import { useNavigate } from 'react-router-dom';
import type { GenerationHistoryItem } from '../../hooks/useHistoryData.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';

interface GenerationCardProps {
  generation: GenerationHistoryItem;
  onDownload: (id: string) => void;
}

export function GenerationCard({ generation: gen, onDownload }: GenerationCardProps) {
  const navigate = useNavigate();

  // FIX BUG #1: framework + language dynamiques (jamais de string en dur)
  const frameworkLabel = gen.framework.charAt(0).toUpperCase() + gen.framework.slice(1);
  const languageLabel = gen.language.charAt(0).toUpperCase() + gen.language.slice(1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 ml-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {gen.status === 'success' ? (
              <Badge variant="success">✓ Succès</Badge>
            ) : (
              <Badge variant="destructive">✗ Erreur</Badge>
            )}
            <span className="text-xs text-gray-400 font-mono">{gen.id.slice(0, 8)}</span>
            {gen.usedImprovedVersion && (
              <Badge variant="secondary">✨ version améliorée</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>{gen.llmProvider} · {gen.llmModel}</span>
            <span>{frameworkLabel} · {languageLabel}</span>
            {gen.durationMs !== null && <span>{Math.round(gen.durationMs / 1000)}s</span>}
          </div>
          <p className="text-xs text-gray-300 mt-1">
            {new Date(gen.createdAt).toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {/* FIX BUG #2: navigue vers /stories/:userStoryId et non /stories */}
          <Button
            variant="outline"
            size="xs"
            onClick={() => gen.userStoryId && navigate(`/stories/${gen.userStoryId}`)}
            disabled={!gen.userStoryId}
            title={gen.userStoryId ? undefined : 'US non disponible'}
          >
            Voir US
          </Button>
          {gen.status === 'success' && (
            <Button
              size="xs"
              onClick={() => onDownload(gen.id)}
            >
              ⬇ ZIP
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
