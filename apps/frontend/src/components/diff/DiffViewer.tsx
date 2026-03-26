import { useState, useMemo } from 'react';
import { computeWordDiff } from '../../utils/diff.js';
import { DiffViewerUnified } from './DiffViewerUnified.js';
import { DiffViewerSideBySide } from './DiffViewerSideBySide.js';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Badge } from '@/components/ui/badge.js';

interface DiffViewerProps {
  original: string;
  improved: string;
}

export function DiffViewer({ original, improved }: DiffViewerProps) {
  const [mode, setMode] = useState<'unified' | 'side-by-side'>('unified');
  const tokens = useMemo(() => computeWordDiff(original, improved), [original, improved]);
  const changeCount = tokens.filter((t) => t.type !== 'unchanged').length;

  return (
    <div>
      {/* Header : compteur de modifications + toggle */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary">
          {changeCount} modification{changeCount > 1 ? 's' : ''}
        </Badge>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'unified' | 'side-by-side')}>
          <TabsList>
            <TabsTrigger value="unified" onClick={() => setMode('unified')}>Unifié</TabsTrigger>
            <TabsTrigger value="side-by-side" className="hidden md:inline-flex" onClick={() => setMode('side-by-side')}>Côte à côte</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === 'unified' ? (
        <DiffViewerUnified tokens={tokens} />
      ) : (
        <DiffViewerSideBySide tokens={tokens} />
      )}
    </div>
  );
}
