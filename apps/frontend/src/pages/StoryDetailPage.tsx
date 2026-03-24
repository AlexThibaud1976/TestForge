import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { AnalysisScore } from '../components/analysis/AnalysisScore.js';
import { SuggestionsList } from '../components/analysis/SuggestionsList.js';
import { ImprovedVersion } from '../components/analysis/ImprovedVersion.js';
import { CodeViewer } from '../components/generation/CodeViewer.js';
import { FrameworkSelector } from '../components/generation/FrameworkSelector.js';
import { useRealtimeRow } from '../hooks/useRealtime.js';

interface UserStory {
  id: string;
  externalId: string;
  title: string;
  description: string;
  acceptanceCriteria: string | null;
  status: string;
  labels: string[];
  fetchedAt: string;
}

interface AnalysisSuggestion {
  priority: 'critical' | 'recommended' | 'optional';
  issue: string;
  suggestion: string;
}

interface Analysis {
  id: string;
  scoreGlobal: number;
  scoreClarity: number;
  scoreCompleteness: number;
  scoreTestability: number;
  scoreEdgeCases: number;
  scoreAcceptanceCriteria: number;
  suggestions: AnalysisSuggestion[];
  improvedVersion: string | null;
  llmProvider: string;
  llmModel: string;
  createdAt: string;
}

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';
type GenerationState = 'idle' | 'loading' | 'done' | 'error';

interface GeneratedFile {
  type: 'page_object' | 'test_spec' | 'fixtures';
  filename: string;
  content: string;
}

interface Generation {
  id: string;
  files: GeneratedFile[];
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  durationMs: number;
  createdAt: string;
}

export function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<UserStory | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<'original' | 'improved'>('original');
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [framework, setFramework] = useState<'playwright' | 'selenium'>('playwright');
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python' | 'java' | 'csharp'>('typescript');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      api.get<UserStory>(`/api/user-stories/${id}`),
      api.get<Analysis | null>(`/api/analyses?userStoryId=${id}`),
    ]).then(([s, a]) => {
      setStory(s);
      if (a) { setAnalysis(a); setAnalysisState('done'); }
    }).finally(() => setLoading(false));
  }, [id]);

  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);

  // Écoute Realtime : dès que status passe à 'success' ou 'error', on charge les fichiers
  useRealtimeRow<{ id: string; status: string }>('generations', pendingGenerationId, async (row) => {
    if (row.status === 'success') {
      const full = await api.get<Generation>(`/api/generations/${row.id}`);
      setGeneration(full);
      setGenerationState('done');
      setPendingGenerationId(null);
    } else if (row.status === 'error') {
      setGenerationError('Erreur lors de la génération. Réessayez.');
      setGenerationState('error');
      setPendingGenerationId(null);
    }
  });

  const handleGenerate = async (useImproved: boolean) => {
    if (!analysis) return;
    setGenerationState('loading');
    setGenerationError(null);
    try {
      // Retourne immédiatement { id, status: 'pending' }
      const pending = await api.post<{ id: string; status: string }>('/api/generations', {
        analysisId: analysis.id,
        useImprovedVersion: useImproved,
        framework,
        language,
      });
      setPendingGenerationId(pending.id); // active l'écoute Realtime
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Erreur lors de la génération');
      setGenerationState('error');
    }
  };

  const handleAnalyze = async () => {
    if (!story) return;
    setAnalysisState('loading');
    setAnalysisError(null);
    try {
      const result = await api.post<Analysis>('/api/analyses', { userStoryId: story.id });
      setAnalysis(result);
      setAnalysisState('done');
      localStorage.setItem('testforge_first_analysis', 'true');
      window.dispatchEvent(new Event('testforge_analysis_done'));
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse');
      setAnalysisState('error');
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;
  if (!story) return (
    <div className="p-6">
      <p className="text-sm text-red-500">User story introuvable.</p>
      <button onClick={() => void navigate('/stories')} className="mt-2 text-sm text-blue-600 hover:underline">← Retour</button>
    </div>
  );

  const displayText = activeVersion === 'improved' && analysis?.improvedVersion
    ? analysis.improvedVersion
    : story.description;

  return (
    <div className="p-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => void navigate('/stories')} className="text-sm text-gray-400 hover:text-gray-600">← User Stories</button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-mono text-gray-500">{story.externalId}</span>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Colonne gauche — US */}
        <div className="col-span-3 space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{story.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-mono text-gray-400">{story.externalId}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{story.status}</span>
              {story.labels.map((l) => (
                <span key={l} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{l}</span>
              ))}
            </div>
          </div>

          {/* Toggle original / améliorée */}
          {analysis?.improvedVersion && (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => setActiveVersion('original')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeVersion === 'original' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                US originale
              </button>
              <button
                onClick={() => setActiveVersion('improved')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeVersion === 'improved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ✨ Version améliorée
              </button>
            </div>
          )}

          <Section title="Description">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayText || <span className="text-gray-400 italic">Aucune description</span>}</p>
          </Section>

          {story.acceptanceCriteria && (
            <Section title="Critères d'acceptance">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{story.acceptanceCriteria}</p>
            </Section>
          )}

          {/* Version améliorée complète */}
          {analysisState === 'done' && analysis?.improvedVersion && (
            <Section title="Version améliorée suggérée">
              <ImprovedVersion
                original={story.description}
                improved={analysis.improvedVersion}
                onUse={(text) => {
                  setActiveVersion('improved');
                  setAnalysis((a) => a ? { ...a, improvedVersion: text } : a);
                }}
              />
            </Section>
          )}
        </div>

        {/* Colonne droite — Actions + Analyse */}
        <div className="col-span-2 space-y-4">
          {/* Bouton analyser */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Analyse qualité</h3>

            {analysisState === 'idle' && (
              <>
                {analysis && story && new Date(analysis.createdAt) < new Date(story.fetchedAt) && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700">
                    ⚠️ L'US a été mise à jour depuis cette analyse. Relancez l'analyse.
                  </div>
                )}
                <button
                  onClick={() => void handleAnalyze()}
                  className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Analyser cette US
                </button>
              </>
            )}

            {analysisState === 'loading' && (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs text-gray-400">Analyse en cours...</p>
                <p className="text-xs text-gray-300">~8 secondes</p>
              </div>
            )}

            {analysisState === 'error' && (
              <div>
                <p className="text-xs text-red-600 mb-2">{analysisError}</p>
                <button
                  onClick={() => void handleAnalyze()}
                  className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Réessayer
                </button>
              </div>
            )}

            {analysisState === 'done' && analysis && (
              <div>
                {story && new Date(analysis.createdAt) < new Date(story.fetchedAt) && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700">
                    ⚠️ L'US a été mise à jour depuis cette analyse.
                  </div>
                )}
                <AnalysisScore
                  scoreGlobal={analysis.scoreGlobal}
                  scoreClarity={analysis.scoreClarity}
                  scoreCompleteness={analysis.scoreCompleteness}
                  scoreTestability={analysis.scoreTestability}
                  scoreEdgeCases={analysis.scoreEdgeCases}
                  scoreAcceptanceCriteria={analysis.scoreAcceptanceCriteria}
                />
                <button
                  onClick={() => void handleAnalyze()}
                  className="w-full mt-3 py-1.5 px-3 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
                >
                  Relancer l'analyse
                </button>
                <p className="text-xs text-gray-300 mt-1 text-center">
                  {analysis.llmProvider} · {analysis.llmModel}
                </p>
              </div>
            )}
          </div>

          {/* Génération — juste sous Analyse qualité */}
          {analysisState === 'done' && analysis && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Générer les tests</h3>

              {analysis.scoreGlobal < 40 && (
                <p className="text-xs text-yellow-600 mb-3 bg-yellow-50 p-2 rounded">
                  ⚠️ Score faible — la génération sera de qualité limitée.
                </p>
              )}

              {generationState === 'idle' && (
                <div className="space-y-3">
                  <FrameworkSelector
                    framework={framework}
                    language={language}
                    onChange={(fw, lang) => { setFramework(fw); setLanguage(lang); }}
                  />
                  <button
                    onClick={() => void handleGenerate(false)}
                    className="w-full py-2 px-3 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    Générer (US originale)
                  </button>
                  {analysis.improvedVersion && (
                    <button
                      onClick={() => void handleGenerate(true)}
                      className="w-full py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      ✨ Générer (version améliorée)
                    </button>
                  )}
                </div>
              )}

              {generationState === 'loading' && (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-gray-400">Génération en cours...</p>
                  <p className="text-xs text-gray-300">~25 secondes</p>
                </div>
              )}

              {generationState === 'error' && (
                <div>
                  <p className="text-xs text-red-600 mb-2">{generationError}</p>
                  <button
                    onClick={() => setGenerationState('idle')}
                    className="w-full py-1.5 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {generationState === 'done' && generation && (
                <div>
                  <p className="text-xs text-green-600 mb-2">✓ {generation.files.length} fichiers générés</p>
                  <button
                    onClick={() => setGenerationState('idle')}
                    className="w-full py-1.5 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
                  >
                    Regénérer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Suggestions */}
          {analysisState === 'done' && analysis && (
            <Section title={`Suggestions (${analysis.suggestions.length})`}>
              <SuggestionsList suggestions={analysis.suggestions} />
            </Section>
          )}
        </div>
      </div>

      {/* Code généré — pleine largeur sous la grille */}
      {generationState === 'done' && generation && generation.files.length > 0 && (
        <div className="mt-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Tests générés</h2>
              <span className="text-xs text-gray-400">
                {generation.usedImprovedVersion ? '✨ Version améliorée' : 'US originale'} · {generation.llmProvider} · {Math.round(generation.durationMs / 1000)}s
              </span>
            </div>
            <CodeViewer files={generation.files} generationId={generation.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  );
}
