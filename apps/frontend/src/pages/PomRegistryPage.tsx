import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardContent } from '@/components/ui/card.js';

interface PomMethod {
  name: string;
  params: string;
  returnType: string;
  jsdoc: string | null;
}

interface PomEntry {
  id: string;
  className: string;
  filename: string;
  methods: PomMethod[];
  framework: string;
  language: string;
  sourceUserStoryId: string | null;
  updatedAt: string;
}

export function PomRegistryPage() {
  const [poms, setPoms] = useState<PomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api.get<PomEntry[]>('/api/pom-registry')
      .then(setPoms)
      .catch(() => setPoms([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, className: string) => {
    if (!confirm(`Supprimer le POM "${className}" du registre ?`)) return;
    await api.delete(`/api/pom-registry/${id}`).catch(() => null);
    setPoms((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registre POM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Page Objects partagés entre les générations. Injectés automatiquement dans le contexte LLM.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Chargement...</div>
      ) : poms.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-3">📄</p>
          <p className="text-sm">Aucun Page Object enregistré.</p>
          <p className="text-xs mt-1">Les POM sont extraits automatiquement après chaque génération réussie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {poms.map((pom) => (
            <Card key={pom.id}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(expanded === pom.id ? null : pom.id)}
                      className="flex items-center gap-2 text-left min-w-0 h-auto p-0 hover:bg-transparent"
                    >
                      <span className="text-sm font-semibold text-gray-900 font-mono">{pom.className}</span>
                      <span className="text-xs text-gray-400 truncate">{pom.filename}</span>
                      <span className="text-xs text-gray-300">{expanded === pom.id ? '▲' : '▼'}</span>
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{pom.methods.length} méthode{pom.methods.length > 1 ? 's' : ''}</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {pom.framework}/{pom.language}
                    </Badge>
                    <span className="text-xs text-gray-300">
                      {new Date(pom.updatedAt).toLocaleDateString('fr-FR')}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => void handleDelete(pom.id, pom.className)}
                      className="text-xs text-red-400 hover:text-red-600 border-red-100 hover:bg-red-50"
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>

                {expanded === pom.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pb-2 font-medium">Méthode</th>
                          <th className="text-left pb-2 font-medium">Params</th>
                          <th className="text-left pb-2 font-medium">Retour</th>
                          <th className="text-left pb-2 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pom.methods.map((method, i) => (
                          <tr key={i}>
                            <td className="py-1.5 font-mono text-indigo-600">{method.name}</td>
                            <td className="py-1.5 text-gray-500 font-mono">{method.params || '—'}</td>
                            <td className="py-1.5 text-gray-400 font-mono">{method.returnType}</td>
                            <td className="py-1.5 text-gray-500 italic">{method.jsdoc || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
