import { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';

interface GeneratedFile {
  type: 'page_object' | 'test_spec' | 'fixtures';
  filename: string;
  content: string;
}

interface CodeViewerProps {
  files: GeneratedFile[];
  generationId: string;
}

const FILE_LABELS: Record<string, string> = {
  page_object: '📄 Page Object',
  test_spec:   '🧪 Test Spec',
  fixtures:    '📦 Fixtures',
};

function fileLanguage(file: GeneratedFile): string {
  if (file.type === 'fixtures') return 'json';
  return 'typescript';
}

function HighlightedCode({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void codeToHtml(code, {
      lang: language,
      theme: 'github-dark',
    }).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => { cancelled = true; };
  }, [code, language]);

  if (!html) {
    return (
      <pre className="text-xs text-gray-300 p-4 overflow-x-auto">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      className="text-xs overflow-x-auto [&>pre]:p-4 [&>pre]:m-0 [&>pre]:rounded-none"
      // shiki génère du HTML safe — pas d'injection possible ici
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function CodeViewer({ files, generationId }: CodeViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeFile = files[activeIndex];

  const handleCopy = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const { supabase } = await import('../../lib/supabase.js');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const apiUrl = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

    const res = await fetch(`${apiUrl}/api/generations/${generationId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { alert('Erreur lors du téléchargement'); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testforge-${generationId.slice(0, 8)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeFile) return null;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header — onglets + actions */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 gap-2">
        <div className="flex gap-1 overflow-x-auto">
          {files.map((file, i) => (
            <button
              key={file.filename}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 px-3 py-1 text-xs rounded-md transition-colors ${
                i === activeIndex
                  ? 'bg-gray-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {FILE_LABELS[file.type] ?? file.filename}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => void handleCopy()}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            {copied ? '✓ Copié' : 'Copier'}
          </button>
          <button
            onClick={() => void handleDownload()}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            ⬇ ZIP
          </button>
        </div>
      </div>

      {/* Nom du fichier */}
      <div className="bg-gray-900 px-4 py-1.5 text-xs text-gray-400 font-mono border-b border-gray-700">
        {activeFile.filename}
      </div>

      {/* Code */}
      <div className="bg-gray-900 max-h-[500px] overflow-y-auto">
        <HighlightedCode
          code={activeFile.content}
          language={fileLanguage(activeFile)}
        />
      </div>
    </div>
  );
}
