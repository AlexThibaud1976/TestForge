import { useState } from 'react';

export type ValidationStatus = 'skipped' | 'valid' | 'auto_corrected' | 'has_errors' | null;

export interface ValidationError {
  filename: string;
  line: number;
  message: string;
}

interface Props {
  status: ValidationStatus;
  errors?: ValidationError[];
  correctionAttempts?: number | null;
}

export function ValidationBadge({ status, errors = [], correctionAttempts }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!status || status === 'skipped') return null;

  if (status === 'valid') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
        ✓ Code validé
      </span>
    );
  }

  if (status === 'auto_corrected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full">
        ✦ Corrigé ({correctionAttempts ?? 1} correction{(correctionAttempts ?? 1) > 1 ? 's' : ''})
      </span>
    );
  }

  // has_errors
  return (
    <div className="inline-block">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-full hover:bg-red-100"
      >
        ⚠ {errors.length} erreur{errors.length > 1 ? 's' : ''} détectée{errors.length > 1 ? 's' : ''}
        <span>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && errors.length > 0 && (
        <div className="mt-1 bg-red-50 border border-red-200 rounded-lg p-2 text-xs space-y-1 max-w-sm">
          {errors.map((e, i) => (
            <div key={i} className="text-red-700">
              <span className="font-mono text-red-400">{e.filename}:{e.line}</span>
              <span className="ml-1">{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
