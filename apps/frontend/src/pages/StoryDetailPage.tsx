import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { AnalysisScore } from '../components/analysis/AnalysisScore.js';
import { SuggestionsList } from '../components/analysis/SuggestionsList.js';
import { ImprovedVersion } from '../components/analysis/ImprovedVersion.js';
import { CodeViewer } from '../components/generation/CodeViewer.js';
import { FrameworkSelector } from '../components/generation/FrameworkSelector.js';
import { useRealtimeRow } from '../hooks/useRealtime.js';
import { WritebackButton } from '../components/WritebackButton.js';
import { GitPushButton } from '../components/GitPushButton.js';
import { XrayTestButton } from '../components/XrayTestButton.js';
import { ADOTestCaseButton } from '../components/ADOTestCaseButton.js';
import { ManualTestList } from '../components/ManualTestList.js';
import { ValidationBadge } from '../components/ValidationBadge.js';
import { FeedbackWidget } from '../components/FeedbackWidget.js';
import { TestPreview } from '../components/TestPreview.js';
import { ManualTestGenerateButton } from '../components/ManualTestGenerateButton.js';
import { ManualTestValidateButton } from '../components/ManualTestValidateButton.js';
import { ManualTestPushButton } from '../components/ManualTestPushButton.js';
import type { ManualTestSet } from '@testforge/shared-types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserStory {
  id: string; externalId: string; title: string; description: string;
  acceptanceCriteria: string | null; status: string; labels: string[]; fetchedAt: string;
}
interface AnalysisSuggestion {
  priority: 'critical' | 'recommended' | 'optional'; issue: string; suggestion: string;
}
interface Analysis {
  id: string; scoreGlobal: number; scoreClarity: number; scoreCompleteness: number;
  scoreTestability: number; scoreEdgeCases: number; scoreAcceptanceCriteria: number;
  suggestions: AnalysisSuggestion[]; improvedVersion: string | null;
  llmProvider: string; llmModel: string; createdAt: string;
}
interface GeneratedFile {
  type: 'page_object' | 'test_spec' | 'fixtures'; filename: string; content: string;
}
interface Generation {
  id: string; files: GeneratedFile[]; usedImprovedVersion: boolean;
  llmProvider: string; llmModel: string; durationMs: number; createdAt: string;
  validationStatus?: 'skipped' | 'valid' | 'auto_corrected' | 'has_errors' | null;
  validationErrors?: Array<{ filename: string; line: number; message: string }>;
  correctionAttempts?: number | null;
}
type AnalysisState = 'idle' | 'loading' | 'done' | 'error';
type GenerationState = 'idle' | 'loading' | 'done' | 'error';
type Tab = 'analysis' | 'manual-tests' | 'generation';

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [framework, setFramework] = useState<'playwright' | 'selenium'>('playwright');
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python' | 'java' | 'csharp'>('typescript');
  const [linkManualTests, setLinkManualTests] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [loading, setLoading] = useState(true);
  const [manualTestSet, setManualTestSet] = useState<ManualTestSet | null>(null);
  const [manualTestLoading, setManualTestLoading] = useState(false);
  // Feature 008: détection de changement
  const [changeStatus, setChangeStatus] = useState<{ changed: boolean; generationId: string | null } | null>(null);
  const [showIncrementalDialog, setShowIncrementalDialog] = useState(false);
  // Feature 011: preview
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) return;
    void Promise.all([
      api.get<UserStory>(`/api/user-stories/${id}`),
      api.get<Analysis | null>(`/api/analyses?userStoryId=${id}`),
    ]).then(([s, a]) => {
      setStory(s);
      if (a) {
        setAnalysis(a);
        setAnalysisState('done');
        // Charger les tests manuels existants
        setManualTestLoading(true);
        api.get<ManualTestSet>(`/api/analyses/${a.id}/manual-tests`)
          .then(setManualTestSet)
          .catch(() => setManualTestSet(null))
          .finally(() => setManualTestLoading(false));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  // Realtime : quand la génération est prête, passer automatiquement sur l'onglet génération
  useRealtimeRow<{ id: string; status: string }>('generations', pendingGenerationId, async (row) => {
    if (row.status === 'success') {
      const full = await api.get<Generation>(`/api/generations/${row.id}`);
      setGeneration(full);
      setGenerationState('done');
      setPendingGenerationId(null);
      setActiveTab('generation');
      // Feature 008: vérifier si l'US a changé depuis cette génération
      if (story?.id) {
        api.get<{ changed: boolean; generationId: string | null }>(`/api/user-stories/${story.id}/change-status`)
          .then(setChangeStatus)
          .catch(() => null);
      }
    } else if (row.status === 'error') {
      setGenerationError('Erreur lors de la génération. Réessayez.');
      setGenerationState('error');
      setPendingGenerationId(null);
    }
  });

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

  const handleGenerate = async (useImproved: boolean, incremental = false) => {
    if (!analysis) return;
    setGenerationState('loading');
    setGenerationError(null);
    setShowIncrementalDialog(false);
    try {
      const pending = await api.post<{ id: string; status: string }>('/api/generations', {
        analysisId: analysis.id,
        useImprovedVersion: useImproved,
        framework,
        language,
        ...(linkManualTests && manualTestSet?.status !== 'draft' ? { manualTestSetId: manualTestSet?.id } : {}),
        ...(incremental && changeStatus?.generationId ? {
          incremental: true,
          previousGenerationId: changeStatus.generationId,
        } : {}),
      });
      setPendingGenerationId(pending.id);
    } catch (e) {
      setGenerationError(e instanceof Error ? e.message : 'Erreur lors de la génération');
      setGenerationState('error');
    }
  };

  const checkChangeStatus = (analysisId: string) => {
    api.get<{ changed: boolean; generationId: string | null }>(`/api/user-stories/${story?.id}/change-status`)
      .then(setChangeStatus)
      .catch(() => setChangeStatus(null));
  };

  const displayText = activeVersion === 'improved' && analysis?.improvedVersion
    ? analysis.improvedVersion : story?.description ?? '';

  const isStale = analysis && story && new Date(analysis.createdAt) < new Date(story.fetchedAt);

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;
  if (!story) return (
    <div className="p-6">
      <p className="text-sm text-red-500">User story introuvable.</p>
      <button onClick={() => void navigate('/stories')} className="mt-2 text-sm text-blue-600 hover:underline">← Retour</button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Header fixe ── */}
      <div className="px-6 pt-5 pb-0 border-b border-gray-200 bg-white">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <button onClick={() => void navigate('/stories')} className="text-gray-400 hover:text-gray-600">← User Stories</button>
          <span className="text-gray-300">/</span>
          <span className="font-mono text-gray-500">{story.externalId}</span>
        </div>

        {/* Titre + badges */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{story.title}</h1>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{story.status}</span>
          {story.labels.map((l) => (
            <span key={l} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{l}</span>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 -mb-px">
          <TabButton
            active={activeTab === 'analysis'}
            onClick={() => setActiveTab('analysis')}
            label="📋 Analyse & US"
            badge={analysisState === 'done' ? (analysis ? `${analysis.scoreGlobal}/100` : undefined) : undefined}
            badgeColor={analysis && analysis.scoreGlobal >= 70 ? 'green' : analysis && analysis.scoreGlobal >= 40 ? 'yellow' : 'red'}
          />
          <TabButton
            active={activeTab === 'manual-tests'}
            onClick={() => setActiveTab('manual-tests')}
            label="📋 Tests manuels"
            badge={manualTestSet ? `${manualTestSet.testCases.length}` : undefined}
            badgeColor={manualTestSet?.status === 'validated' || manualTestSet?.status === 'pushed' ? 'green' : 'blue'}
            disabled={analysisState !== 'done'}
          />
          <TabButton
            active={activeTab === 'generation'}
            onClick={() => setActiveTab('generation')}
            label="⚙️ Génération de tests"
            badge={generationState === 'done' ? '✓' : generationState === 'loading' ? '...' : undefined}
            badgeColor="blue"
            disabled={analysisState !== 'done'}
          />
        </div>
      </div>

      {/* ── Contenu des onglets ── */}
      <div className="flex-1 overflow-auto">

        {/* ── Onglet 1 : Analyse & US ── */}
        {activeTab === 'analysis' && (
          <div className="p-6 max-w-6xl grid grid-cols-5 gap-6">

            {/* Gauche : contenu de la US */}
            <div className="col-span-3 space-y-4">
              {analysis?.improvedVersion && (
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                  <button onClick={() => setActiveVersion('original')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeVersion === 'original' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    US originale
                  </button>
                  <button onClick={() => setActiveVersion('improved')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeVersion === 'improved' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    ✨ Version améliorée
                  </button>
                </div>
              )}

              <Card title="Description">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {displayText || <span className="italic text-gray-400">Aucune description</span>}
                </p>
              </Card>

              {story.acceptanceCriteria && (
                <Card title="Critères d'acceptance">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{story.acceptanceCriteria}</p>
                </Card>
              )}

              {analysisState === 'done' && analysis?.improvedVersion && (
                <Card title="✨ Version améliorée suggérée">
                  <ImprovedVersion
                    original={story.description}
                    improved={analysis.improvedVersion}
                    onUse={(text) => {
                      setActiveVersion('improved');
                      setAnalysis((a) => a ? { ...a, improvedVersion: text } : a);
                    }}
                  />
                </Card>
              )}
            </div>

            {/* Droite : Analyse + Suggestions */}
            <div className="col-span-2 space-y-4">
              <Card title="Analyse qualité">
                {isStale && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700">
                    ⚠️ L'US a été mise à jour. Relancez l'analyse.
                  </div>
                )}

                {analysisState === 'idle' && (
                  <button onClick={() => void handleAnalyze()}
                    className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                    Analyser cette US
                  </button>
                )}
                {analysisState === 'loading' && (
                  <div className="text-center py-6">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-gray-400">Analyse en cours...</p>
                    <p className="text-xs text-gray-300">~8 secondes</p>
                  </div>
                )}
                {analysisState === 'error' && (
                  <div>
                    <p className="text-xs text-red-600 mb-2">{analysisError}</p>
                    <button onClick={() => void handleAnalyze()}
                      className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                      Réessayer
                    </button>
                  </div>
                )}
                {analysisState === 'done' && analysis && (
                  <div className="space-y-3">
                    <AnalysisScore
                      scoreGlobal={analysis.scoreGlobal}
                      scoreClarity={analysis.scoreClarity}
                      scoreCompleteness={analysis.scoreCompleteness}
                      scoreTestability={analysis.scoreTestability}
                      scoreEdgeCases={analysis.scoreEdgeCases}
                      scoreAcceptanceCriteria={analysis.scoreAcceptanceCriteria}
                    />
                    <button onClick={() => void handleAnalyze()}
                      className="w-full py-1.5 text-xs border border-gray-200 rounded-md text-gray-400 hover:bg-gray-50">
                      Relancer l'analyse
                    </button>
                    <p className="text-xs text-gray-300 text-center">{analysis.llmProvider} · {analysis.llmModel}</p>
                  </div>
                )}
              </Card>

              {analysisState === 'done' && analysis && (
                <Card title={`Suggestions (${analysis.suggestions.length})`}>
                  <SuggestionsList suggestions={analysis.suggestions} />
                </Card>
              )}

              {analysisState === 'done' && analysis?.improvedVersion && (
                <WritebackButton
                  analysisId={analysis.id}
                  improvedVersion={analysis.improvedVersion}
                  originalDescription={story.description}
                />
              )}

              {analysisState === 'done' && (
                <button
                  onClick={() => setActiveTab('generation')}
                  className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                >
                  Générer les tests →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Onglet 2 : Tests manuels ── */}
        {activeTab === 'manual-tests' && (
          <div className="p-6 max-w-4xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Tests manuels</h2>
                <p className="text-sm text-gray-500 mt-0.5">Générés depuis les critères d'acceptance, éditables et pushables vers Xray ou ADO.</p>
              </div>
              {analysis && (
                <ManualTestGenerateButton
                  analysisId={analysis.id}
                  hasExisting={!!manualTestSet}
                  onGenerated={(set) => setManualTestSet(set)}
                />
              )}
            </div>

            {manualTestLoading && <p className="text-sm text-gray-400">Chargement...</p>}

            {!manualTestLoading && !manualTestSet && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-sm">Aucun test manuel généré. Cliquez sur "Générer les tests manuels".</p>
              </div>
            )}

            {manualTestSet && (
              <>
                <ManualTestList
                  set={manualTestSet}
                  onUpdated={setManualTestSet}
                />
                <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                  <ManualTestValidateButton
                    setId={manualTestSet.id}
                    status={manualTestSet.status}
                    onValidated={setManualTestSet}
                  />
                  <ManualTestPushButton
                    setId={manualTestSet.id}
                    status={manualTestSet.status}
                    onPushed={(partial) => setManualTestSet((prev) => prev ? { ...prev, ...partial } : prev)}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Onglet 3 : Génération ── */}
        {activeTab === 'generation' && (
          <div className="p-6 max-w-6xl space-y-6">

            {/* Panneau de configuration + boutons */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-800">Configuration</h2>
                <FrameworkSelector
                  framework={framework}
                  language={language}
                  onChange={(fw, lang) => { setFramework(fw); setLanguage(lang); }}
                />

                {analysis && analysis.scoreGlobal < 40 && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md">
                    ⚠️ Score faible ({analysis.scoreGlobal}/100) — résultats de qualité limitée.
                  </p>
                )}

                {/* Feature 008: badge US modifiée */}
                {changeStatus?.changed && generationState === 'idle' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-2 space-y-2">
                    <p className="text-xs text-orange-700 font-medium">⚠️ L'US a été modifiée depuis la dernière génération</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleGenerate(false, true)}
                        className="text-xs bg-orange-600 text-white px-2.5 py-1 rounded hover:bg-orange-700"
                      >
                        ↻ Mettre à jour les tests
                      </button>
                      <button
                        onClick={() => setChangeStatus(null)}
                        className="text-xs text-orange-500 hover:text-orange-700"
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                )}

                {manualTestSet && manualTestSet.status !== 'draft' && (
                  <label className="flex items-start gap-1.5 text-xs text-indigo-700 bg-indigo-50 p-2 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkManualTests}
                      onChange={(e) => setLinkManualTests(e.target.checked)}
                      className="mt-0.5 rounded"
                    />
                    <span>Lier aux tests manuels validés ({manualTestSet.testCases.length} cas) — les IDs seront injectés dans le code</span>
                  </label>
                )}

                <div className="space-y-2 pt-1">
                  {generationState === 'idle' && (
                    <>
                      <button onClick={() => void handleGenerate(false)}
                        className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                        Générer (US originale)
                      </button>
                      {analysis?.improvedVersion && (
                        <button onClick={() => void handleGenerate(true)}
                          className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                          ✨ Générer (version améliorée)
                        </button>
                      )}
                    </>
                  )}

                  {generationState === 'loading' && (
                    <div className="text-center py-5">
                      <div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-xs text-gray-400">Génération en cours...</p>
                      <p className="text-xs text-gray-300">~25 secondes</p>
                    </div>
                  )}

                  {generationState === 'error' && (
                    <div>
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{generationError}</p>
                      <button onClick={() => setGenerationState('idle')}
                        className="w-full py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                        Réessayer
                      </button>
                    </div>
                  )}

                  {generationState === 'done' && generation && (
                    <div className="text-center pt-1">
                      <p className="text-xs text-green-600 mb-2">✓ {generation.files.length} fichiers générés</p>
                      <button onClick={() => setGenerationState('idle')}
                        className="w-full py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                        Regénérer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rappel de l'US analysée */}
              <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">US analysée</h2>
                  {analysis && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      analysis.scoreGlobal >= 70 ? 'bg-green-100 text-green-700' :
                      analysis.scoreGlobal >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {analysis.scoreGlobal}/100
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 mb-2">{story.title}</p>
                <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed">
                  {activeVersion === 'improved' && analysis?.improvedVersion
                    ? analysis.improvedVersion
                    : story.description}
                </p>
                {analysis?.improvedVersion && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setActiveVersion('original')}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${activeVersion === 'original' ? 'bg-white border-gray-300 text-gray-700 shadow-sm' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                      Originale
                    </button>
                    <button onClick={() => setActiveVersion('improved')}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${activeVersion === 'improved' ? 'bg-white border-blue-300 text-blue-700 shadow-sm' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                      ✨ Améliorée
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Code généré — pleine largeur */}
            {generationState === 'done' && generation && generation.files.length > 0 && (
              <div className="space-y-3">
                {/* Boutons d'action V2 + Preview (Feature 011) */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors ${showPreview ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {showPreview ? '🔍 Masquer la preview' : '🔍 Prévisualiser'}
                  </button>
                  <GitPushButton generationId={generation.id} />
                  <XrayTestButton generationId={generation.id} />
                  <ADOTestCaseButton generationId={generation.id} />
                </div>

                {/* Feature 011: TestPreview panel */}
                {showPreview && (() => {
                  const specFile = generation.files.find((f) => f.type === 'test_spec');
                  const fixturesFile = generation.files.find((f) => f.type === 'fixtures');
                  return specFile ? (
                    <div className="bg-white border border-indigo-200 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">🔍 Preview du test</h3>
                      <TestPreview specCode={specFile.content} fixturesJson={fixturesFile?.content} />
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-400 text-center">
                      Aucun fichier spec trouvé pour la preview.
                    </div>
                  );
                })()}

                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-900 to-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium text-sm">Tests générés</span>
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        {generation.files.length} fichiers
                      </span>
                      {generation.usedImprovedVersion && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                          ✨ version améliorée
                        </span>
                      )}
                      {generation.validationStatus && generation.validationStatus !== 'skipped' && (
                        <ValidationBadge
                          status={generation.validationStatus}
                          errors={generation.validationErrors}
                          correctionAttempts={generation.correctionAttempts}
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {generation.llmProvider} · {generation.llmModel} · {Math.round(generation.durationMs / 1000)}s
                    </span>
                  </div>
                  <CodeViewer files={generation.files} generationId={generation.id} />
                  <div className="px-5 pb-4 bg-gray-900 border-t border-gray-700">
                    <FeedbackWidget generationId={generation.id} />
                  </div>
                </div>
              </div>
            )}

            {/* État vide — pas encore généré */}
            {generationState === 'idle' && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">⚙️</p>
                <p className="text-sm font-medium text-gray-500">Configurez et lancez la génération</p>
                <p className="text-xs mt-1">Choisissez le framework et le langage, puis cliquez sur Générer</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composants locaux ────────────────────────────────────────────────────────

function TabButton({ active, onClick, label, badge, badgeColor = 'blue', disabled }: {
  active: boolean; onClick: () => void; label: string;
  badge?: string; badgeColor?: 'green' | 'yellow' | 'red' | 'blue';
  disabled?: boolean;
}) {
  const badgeClasses: Record<string, string> = {
    green:  'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red:    'bg-red-100 text-red-700',
    blue:   'bg-blue-100 text-blue-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {label}
      {badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${badgeClasses[badgeColor]}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  );
}
