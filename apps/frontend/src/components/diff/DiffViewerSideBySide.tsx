import type { DiffToken } from '../../utils/diff.js';

interface DiffViewerSideBySideProps {
  tokens: DiffToken[];
}

function renderSide(
  side: 'left' | 'right',
  tokens: DiffToken[],
): React.ReactNode {
  const filtered = tokens.filter((t) =>
    side === 'left' ? t.type !== 'added' : t.type !== 'removed',
  );

  return filtered.map((token, i) => {
    if (side === 'left' && token.type === 'removed') {
      return (
        <span key={i} className="bg-red-100 text-red-800 line-through">
          {token.text}
        </span>
      );
    }
    if (side === 'right' && token.type === 'added') {
      return (
        <span key={i} className="bg-green-100 text-green-800">
          {token.text}
        </span>
      );
    }
    return <span key={i}>{token.text}</span>;
  });
}

export function DiffViewerSideBySide({ tokens }: DiffViewerSideBySideProps) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm leading-relaxed">
      <div className="border border-red-200 rounded-lg p-3 bg-red-50/30">
        <p className="text-xs font-medium text-gray-500 mb-2">Original</p>
        <div className="whitespace-pre-wrap font-mono">
          {renderSide('left', tokens)}
        </div>
      </div>
      <div className="border border-green-200 rounded-lg p-3 bg-green-50/30">
        <p className="text-xs font-medium text-gray-500 mb-2">Amélioré</p>
        <div className="whitespace-pre-wrap font-mono">
          {renderSide('right', tokens)}
        </div>
      </div>
    </div>
  );
}
