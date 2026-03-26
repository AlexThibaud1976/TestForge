import { useState, useMemo } from 'react';
import { computeWordDiff } from '../../utils/diff.js';
import { DiffViewerUnified } from './DiffViewerUnified.js';
import { DiffViewerSideBySide } from './DiffViewerSideBySide.js';

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
        <span className="text-xs text-gray-500">
          {`${changeCount} modification${changeCount > 1 ? 's' : ''}`}
        </span>
        <div className="flex gap-1 bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setMode('unified')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'unified'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Unifié
          </button>
          <button
            onClick={() => setMode('side-by-side')}
            className={`text-xs px-2 py-1 rounded transition-colors hidden md:block ${
              mode === 'side-by-side'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Côte à côte
          </button>
        </div>
      </div>

      {mode === 'unified' ? (
        <DiffViewerUnified tokens={tokens} />
      ) : (
        <DiffViewerSideBySide tokens={tokens} />
      )}
    </div>
  );
}
