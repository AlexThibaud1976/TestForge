import { useState } from 'react';

interface ImprovedVersionProps {
  original: string;
  improved: string;
  onUse: (text: string) => void;
}

export function ImprovedVersion({ original, improved, onUse }: ImprovedVersionProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(improved);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* US originale */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">US originale</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {original}
        </div>
      </div>

      {/* Version améliorée */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Version améliorée suggérée</p>
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {text}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onUse(text)}
          className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Utiliser cette version →
        </button>
        <button
          onClick={() => setEditing((e) => !e)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
        >
          {editing ? 'Aperçu' : 'Éditer'}
        </button>
        <button
          onClick={() => void handleCopy()}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
        >
          {copied ? '✓' : 'Copier'}
        </button>
      </div>
    </div>
  );
}
