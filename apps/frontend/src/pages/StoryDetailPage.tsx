import { useState, useEffect, useRef } from 'react';
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
import { DiffViewer } from '../components/diff/DiffViewer.js';
import { ProgressTracker, ANALYSIS_STEPS, GENERATION_STEPS } from '../components/progress/ProgressTracker.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.js';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
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
  const [activeVersion, setActiveVersion] = useState<'original' | 'improved' | 'diff'>('original');

  // Analyse async
  const [pendingAnalysisId, setPendingAnalysisId] = useState<string | null>(null);
  const [analysisCurrentStep, setAnalysisCurrentStep] = useState<string | null>(null);
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number>(Date.now());
  const [analysisEstimatedMs, setAnalysisEstimatedMs] = useState<number>(15000);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generation, setGeneration] = useState<Generation | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [generationCurrentStep, setGenerationCurrentStep] = useState<string | null>(null);
  const [generationStartedAt, setGenerationStartedAt] = useState<number>(Date.now());
  const [generationEstimatedMs, setGenerationEstimatedMs] = useState<number>(25000);
  const [framework, setFramework] = useState<'playwright' | 'selenium' | 'cypress'>('playwright');
  const [language, setLanguage] = useState<'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'ruby' | 'kotlin'>('typescript');
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

  // Realtime analyses : progress_step + status
  useRealtimeRow<{ id: string; status: string; progress_step: string | null }>(
    'analyses',
    pendingAnalysisId,
    async (row) => {
      if (row.progress_step) setAnalysisCurrentStep(row.progress_step);
      if (row.status === 'success') {
        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        const full = await api.get<Analysis>(`/api/analyses/${row.id}`);
        setAnalysis(full);
        setAnalysisState('done');
        setPendingAnalysisId(null);
        setAnalysisCurrentStep(null);
        localStorage.setItem('testforge_first_analysis', 'true');
        window.dispatchEvent(new Event('testforge_analysis_done'));
      } else if (row.status === 'error') {
        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        setAnalysisError('Erreur lors de l\'analyse. Réessayez.');
        setAnalysisState('error');
        setPendingAnalysisId(null);
        setAnalysisCurrentStep(null);
      }
    },
  );

  // Realtime : quand la génération est prête, passer automatiquement sur l'onglet génération
  useRealtimeRow<{ id: string; status: string; progress_step: string | null }>(
    'generations',
    pendingGenerationId,
    async (row) => {
      if (row.progress_step) setGenerationCurrentStep(row.progress_step);
      if (row.status === 'success') {
        const full = await api.get<Generation>(`/api/generations/${row.id}`);
        setGeneration(full);
        setGenerationState('done');
        setPendingGenerationId(null);
        setGenerationCurrentStep(null);
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
        setGenerationCurrentStep(null);
      }
    },
  );

  const handleAnalyze = async () => {
    if (!story) return;
    setAnalysisState('loading');
    setAnalysisError(null);
    setAnalysisCurrentStep(null);
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);

    try {
      // Récupérer l'estimation de durée
      const estimate = await api.get<{ estimatedMs: number }>('/api/estimates?type=analysis').catch(() => ({ estimatedMs: 15000 }));
      setAnalysisEstimatedMs(estimate.estimatedMs);

      const now = Date.now();
      setAnalysisStartedAt(now);

      const response = await api.post<{ id: string; status: string } | Analysis>(
        '/api/analyses',
        { userStoryId: story.id },
      );

      // 201 → cache hit, résultat direct
      if ('scoreGlobal' in response) {
        setAnalysis(response as Analysis);
        setAnalysisState('done');
        localStorage.setItem('testforge_first_analysis', 'true');
        window.dispatchEvent(new Event('testforge_analysis_done'));
        return;
      }

      // 202 → async, attendre Realtime
      const pending = response as { id: string; status: string };
      setPendingAnalysisId(pending.id);

      // Timeout 90s
      analysisTimeoutRef.current = setTimeout(() => {
        setAnalysisError('L\'analyse prend trop de temps. Vérifiez votre connexion et réessayez.');
        setAnalysisState('error');
        setPendingAnalysisId(null);
        setAnalysisCurrentStep(null);
      }, 90000);

    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse');
      setAnalysisState('error');
    }
  };

  const handleGenerate = async (useImproved: boolean, incremental = false) => {
    if (!analysis) return;
    setGenerationState('loading');
    setGenerationError(null);
    setGenerationCurrentStep(null);
    setShowIncrementalDialog(false);
    try {
      // Récupérer l'estimation de durée
      const estimate = await api.get<{ estimatedMs: number }>('/api/estimates?type=generation').catch(() => ({ estimatedMs: 25000 }));
      setGenerationEstimatedMs(estimate.estimatedMs);
      setGenerationStartedAt(Date.now());

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

  const checkChangeStatus = (_analysisId: string) => {
    api.get<{ changed: boolean; generationId: string | null }>(`/api/user-stories/${story?.id}/change-status`)
      .then(setChangeStatus)
      .catch(() => setChangeStatus(null));
  };

  // suppress unused warning — used externally if needed
  void checkChangeStatus;
  void showIncrementalDialog;

  const displayText = activeVersion === 'improved' && analysis?.improvedVersion
    ? analysis.improvedVersion : story?.description ?? '';

  const isStale = analysis && story && new Date(analysis.createdAt) < new Date(story.fetchedAt);

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;
  if (!story) return (
    <div className="p-6">
      <p className="text-sm text-red-500">User story introuvable.</p>
      <Button variant="link" onClick={() => void navigate('/stories')} className="mt-2 text-sm">← Retour</Button>
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

        {/* Onglets — shadcn Tabs avec style underline */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
          <TabsList className="flex gap-1 -mb-px bg-transparent p-0 h-auto rounded-none">
            <TabsTrigger
              value="analysis"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 data-[state=inactive]:hover:border-gray-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              📋 Analyse &amp; US
              {analysisState === 'done' && analysis && (
                <Badge
                  variant="secondary"
                  className={`text-xs px-1.5 py-0.5 font-medium ${
                    analysis.scoreGlobal >= 70 ? 'bg-green-100 text-green-700' :
                    analysis.scoreGlobal >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}
                >
                  {analysis.scoreGlobal}/100
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="manual-tests"
              disabled={analysisState !== 'done'}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 data-[state=inactive]:hover:border-gray-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              📋 Tests manuels
              {manualTestSet && (
                <Badge
                  variant="secondary"
                  className={`text-xs px-1.5 py-0.5 font-medium ${
                    manualTestSet.status === 'validated' || manualTestSet.status === 'pushed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {manualTestSet.testCases.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="generation"
              disabled={analysisState !== 'done'}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 rounded-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700 data-[state=inactive]:hover:border-gray-300 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              ⚙️ Génération de tests
              {(generationState === 'done' || generationState === 'loading') && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-medium bg-blue-100 text-blue-700">
                  {generationState === 'done' ? '✓' : '...'}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                  <button onClick={() => setActiveVersion('diff')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeVersion === 'diff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    🔀 Diff
                  </button>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeVersion === 'diff' && analysis?.improvedVersion ? (
                    <DiffViewer
                      original={story.description ?? ''}
                      improved={analysis.improvedVersion}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {displayText || <span className="italic text-gray-400">Aucune description</span>}
                    </p>
                  )}
                </CardContent>
              </Card>

              {story.acceptanceCriteria && (
                <Card>
                  <CardHeader>
                    <CardTitle>Critères d'acceptation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{story.acceptanceCriteria}</p>
                  </CardContent>
                </Card>
              )}

              {analysisState === 'done' && analysis?.improvedVersion && (
                <Card>
                  <CardHeader>
                    <CardTitle>✨ Version améliorée suggérée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ImprovedVersion
                      original={story.description}
                      improved={analysis.improvedVersion}
                      onUse={(text) => {
                        setActiveVersion('improved');
                        setAnalysis((a) => a ? { ...a, improvedVersion: text } : a);
                      }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Droite : Analyse + Suggestions */}
            <div className="col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analyse qualité</CardTitle>
                </CardHeader>
                <CardContent>
                  {isStale && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-700">
                      ⚠️ L'US a été mise à jour. Relancez l'analyse.
                    </div>
                  )}

                  {analysisState === 'idle' && (
                    <Button className="w-full" onClick={() => void handleAnalyze()}>
                      Analyser cette US
                    </Button>
                  )}
                  {analysisState === 'loading' && (
                    <ProgressTracker
                      steps={ANALYSIS_STEPS}
                      currentStep={analysisCurrentStep}
                      status={pendingAnalysisId ? 'processing' : 'pending'}
                      estimatedMs={analysisEstimatedMs}
                      startedAt={analysisStartedAt}
                    />
                  )}
                  {analysisState === 'error' && (
                    <div>
                      <p className="text-xs text-red-600 mb-2">{analysisError}</p>
                      <Button className="w-full" onClick={() => void handleAnalyze()}>
                        Réessayer
                      </Button>
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
                      <Button variant="outline" size="sm" className="w-full" onClick={() => void handleAnalyze()}>
                        Relancer l'analyse
                      </Button>
                      <p className="text-xs text-gray-300 text-center">{analysis.llmProvider} · {analysis.llmModel}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {analysisState === 'done' && analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Suggestions ({analysis.suggestions.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SuggestionsList suggestions={analysis.suggestions} />
                  </CardContent>
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
                <Button
                  variant="success"
                  className="w-full"
                  onClick={() => setActiveTab('generation')}
                >
                  Générer les tests →
                </Button>
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
                <p className="text-sm text-gray-500 mt-0.5">Générés depuis les critères d'acceptation, éditables et pushables vers Xray ou ADO.</p>
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
                      <Button
                        size="xs"
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => void handleGenerate(false, true)}
                      >
                        ↻ Mettre à jour les tests
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-orange-500 hover:text-orange-700"
                        onClick={() => setChangeStatus(null)}
                      >
                        Ignorer
                      </Button>
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
                      <Button variant="success" className="w-full" onClick={() => void handleGenerate(false)}>
                        Générer (US originale)
                      </Button>
                      {analysis?.improvedVersion && (
                        <Button className="w-full" onClick={() => void handleGenerate(true)}>
                          ✨ Générer (version améliorée)
                        </Button>
                      )}
                    </>
                  )}

                  {generationState === 'loading' && (
                    <ProgressTracker
                      steps={GENERATION_STEPS}
                      currentStep={generationCurrentStep}
                      status={pendingGenerationId ? 'processing' : 'pending'}
                      estimatedMs={generationEstimatedMs}
                      startedAt={generationStartedAt}
                    />
                  )}

                  {generationState === 'error' && (
                    <div>
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">{generationError}</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setGenerationState('idle')}>
                        Réessayer
                      </Button>
                    </div>
                  )}

                  {generationState === 'done' && generation && (
                    <div className="text-center pt-1">
                      <p className="text-xs text-green-600 mb-2">✓ {generation.files.length} fichiers générés</p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setGenerationState('idle')}>
                        Regénérer
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Rappel de l'US analysée */}
              <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">US analysée</h2>
                  {analysis && (
                    <Badge
                      variant="secondary"
                      className={`text-xs font-medium ${
                        analysis.scoreGlobal >= 70 ? 'bg-green-100 text-green-700' :
                        analysis.scoreGlobal >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {analysis.scoreGlobal}/100
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 mb-2">{story.title}</p>
                {activeVersion === 'diff' && analysis?.improvedVersion ? (
                  <div className="text-xs">
                    <DiffViewer
                      original={story.description ?? ''}
                      improved={analysis.improvedVersion}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 line-clamp-4 leading-relaxed">
                    {activeVersion === 'improved' && analysis?.improvedVersion
                      ? analysis.improvedVersion
                      : story.description}
                  </p>
                )}
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
                    <button onClick={() => setActiveVersion('diff')}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${activeVersion === 'diff' ? 'bg-white border-purple-300 text-purple-700 shadow-sm' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                      🔀 Diff
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
                  <Button
                    variant={showPreview ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? '🔍 Masquer la preview' : '🔍 Prévisualiser'}
                  </Button>
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
