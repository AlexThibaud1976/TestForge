import type { DiffToken } from '../../utils/diff.js';

interface DiffViewerUnifiedProps {
  tokens: DiffToken[];
}

export function DiffViewerUnified({ tokens }: DiffViewerUnifiedProps) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
      {tokens.map((token, i) => {
        if (token.type === 'added') {
          return (
            <span key={i} className="bg-green-100 text-green-800">
              {token.text}
            </span>
          );
        }
        if (token.type === 'removed') {
          return (
            <span key={i} className="bg-red-100 text-red-800 line-through">
              {token.text}
            </span>
          );
        }
        return <span key={i}>{token.text}</span>;
      })}
    </div>
  );
}
