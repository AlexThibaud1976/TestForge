import JSZip from 'jszip';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, generations, generatedFiles, llmConfigs, userStories, pomTemplates, manualTestSets, manualTestCases } from '../../db/schema.js';
import { createLLMClient } from '../llm/index.js';
import { decrypt } from '../../utils/encryption.js';
import { getPrompt } from './prompts/registry.js';
import { CodeValidator, type FileError } from './CodeValidator.js';
import { buildCorrectionPrompt } from './prompts/correction-v1.0.js';
import { PomRegistryService, buildPomContextSection } from './PomRegistryService.js';
import { computeStoryHash } from '../../utils/storyHash.js';
import { diffAcceptanceCriteria, formatDiffForPrompt } from '../../utils/diffAC.js';
import { buildIncrementalPrompt, INCREMENTAL_PROMPT_VERSION, INCREMENTAL_SYSTEM_PROMPT } from './prompts/incremental-v1.0.js';
import type { LLMClient } from '../llm/LLMClient.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GeneratedFileResult {
  type: 'page_object' | 'test_spec' | 'fixtures';
  filename: string;
  content: string;
}

// Alias used by Git adapters
export type GeneratedFile = GeneratedFileResult;

export interface GenerationResult {
  id: string;
  analysisId: string;
  teamId: string;
  framework: string;
  language: string;
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  files: GeneratedFileResult[];
  status: string;
  durationMs: number;
  createdAt: Date;
}

// ─── Service ───────────────────────────────────────────────────────────────────

export class GenerationService {
  /**
   * Crée le record pending et retourne immédiatement.
   * Appeler `processGeneration()` en background ensuite.
   */
  async createPending(
    analysisId: string,
    teamId: string,
    useImprovedVersion: boolean,
    framework = 'playwright',
    language = 'typescript',
    manualTestSetId?: string | null,
    incremental = false,
  ): Promise<{ id: string; analysisId: string; status: string }> {
    const analysis = await db.query.analyses.findFirst({
      where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
    });
    if (!analysis) throw new Error('Analysis not found');

    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) throw new Error('No default LLM configuration found for this team.');

    // Feature 008: calculer le hash source de l'US
    const story = analysis.userStoryId
      ? await db.query.userStories.findFirst({ where: eq(userStories.id, analysis.userStoryId) })
      : null;
    const sourceHash = story ? computeStoryHash(story.description, story.acceptanceCriteria) : null;

    const prompt = getPrompt(framework, language);

    const [generation] = await db
      .insert(generations)
      .values({
        analysisId,
        teamId,
        framework,
        language,
        usedImprovedVersion: useImprovedVersion,
        llmProvider: llmConfig.provider,
        llmModel: llmConfig.model,
        promptVersion: prompt.version,
        status: 'pending',
        manualTestSetId: manualTestSetId ?? null,
        sourceHash,
        incremental,
      })
      .returning();

    if (!generation) throw new Error('Failed to create generation record');
    return { id: generation.id, analysisId, status: 'pending' };
  }

  /**
   * Traite la génération en arrière-plan.
   * Met à jour le statut en DB → Supabase Realtime notifie le frontend.
   */
  async processGeneration(
    generationId: string,
    analysisId: string,
    teamId: string,
    useImprovedVersion: boolean,
    framework: string,
    language: string,
    manualTestSetId?: string | null,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Étape 1 : Préparation
      await db.update(generations).set({ progressStep: 'preparing' }).where(eq(generations.id, generationId));

      const analysis = await db.query.analyses.findFirst({
        where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
      });
      if (!analysis) throw new Error('Analysis not found');

      const story = await db.query.userStories.findFirst({
        where: and(eq(userStories.id, analysis.userStoryId!), eq(userStories.teamId, teamId)),
      });
      if (!story) throw new Error('User story not found');

      const llmConfig = await db.query.llmConfigs.findFirst({
        where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
      });
      if (!llmConfig) throw new Error('No LLM config found');

      const prompt = getPrompt(framework, language);

      // V2: injecter le template POM de l'équipe si disponible
      const pomTemplate = await this.getPomTemplate(teamId, framework, language);
      const systemPromptWithTemplate = pomTemplate
        ? `${prompt.systemPrompt}\n\n## Team POM Template\n\nUtilise ce template comme base pour les Page Objects :\n\`\`\`\n${pomTemplate}\n\`\`\``
        : prompt.systemPrompt;

      const client = createLLMClient({
        provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
        model: llmConfig.model,
        apiKey: decrypt(llmConfig.encryptedApiKey),
        ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
        ...(llmConfig.azureDeployment ? { azureDeployment: llmConfig.azureDeployment } : {}),
        ...(llmConfig.ollamaEndpoint ? { ollamaEndpoint: llmConfig.ollamaEndpoint } : {}),
      });

      // Feature 005: Charger les POM existants et injecter dans le prompt
      const pomRegistryService = new PomRegistryService();
      const existingPoms = await pomRegistryService.getRelevantPom(teamId, framework, language, 5);
      const pomContextSection = buildPomContextSection(existingPoms);

      // V Feature 002: Injecter les tests manuels validés si fournis
      const manualTestsSection = manualTestSetId
        ? await this.buildManualTestsSection(manualTestSetId)
        : null;

      const finalSystemPrompt = [
        systemPromptWithTemplate,
        pomContextSection,
        manualTestsSection,
      ].filter(Boolean).join('\n\n');

      // Étape 2 : Appel LLM
      await db.update(generations).set({ progressStep: 'calling_llm' }).where(eq(generations.id, generationId));

      const response = await client.complete(
        [
          { role: 'system', content: finalSystemPrompt },
          {
            role: 'user',
            content: prompt.buildUserPrompt(
              story.title,
              story.description ?? '',
              story.acceptanceCriteria,
              useImprovedVersion,
              analysis.improvedVersion,
            ),
          },
        ],
        { temperature: 0.2, jsonMode: true, maxTokens: 16000 },
      );

      // Étape 3 : Finalisation (parsing + validation)
      await db.update(generations).set({ progressStep: 'finalizing' }).where(eq(generations.id, generationId));

      const parsedFiles = this.parseFiles(response.content);

      // Feature 004: validation syntaxique + self-healing
      const validator = new CodeValidator();
      let validationResult = validator.validateFiles(parsedFiles);
      let finalFiles = parsedFiles;
      let validationStatus: string = validationResult.status === 'valid' ? 'valid' : 'has_errors';
      let correctionAttempts = 0;

      if (validationResult.status === 'has_errors') {
        const healed = await this.selfHeal(parsedFiles, validationResult.errors, client);
        finalFiles = healed.files;
        validationStatus = healed.status;
        correctionAttempts = healed.attempts;
        validationResult = { ...validationResult, errors: healed.remainingErrors };
      }

      if (finalFiles.length > 0) {
        await db.insert(generatedFiles).values(
          finalFiles.map((f) => ({
            generationId,
            fileType: f.type,
            filename: f.filename,
            content: f.content,
          })),
        );
      }

      // Feature 005: Enregistrer les POM dans le registre (non bloquant)
      void pomRegistryService.extractAndRegister(
        generationId, teamId, story.id, finalFiles, framework, language,
      ).catch(() => undefined); // silencieux

      // Mise à jour status → Realtime push au frontend
      await db
        .update(generations)
        .set({
          status: 'success',
          progressStep: null,
          durationMs: Date.now() - startTime,
          validationStatus,
          validationErrors: validationResult.errors,
          correctionAttempts,
        })
        .where(eq(generations.id, generationId));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      await db
        .update(generations)
        .set({ status: 'error', progressStep: null, errorMessage: message, durationMs: Date.now() - startTime })
        .where(eq(generations.id, generationId));
    }
  }

  /** Conservé pour la compatibilité des tests */
  async generate(
    analysisId: string,
    teamId: string,
    useImprovedVersion: boolean,
    framework = 'playwright',
    language = 'typescript',
  ): Promise<GenerationResult> {
    const pending = await this.createPending(analysisId, teamId, useImprovedVersion, framework, language);
    await this.processGeneration(pending.id, pending.analysisId, teamId, useImprovedVersion, framework, language);
    const gen = await db.query.generations.findFirst({ where: eq(generations.id, pending.id) });
    const files = await db.select().from(generatedFiles).where(eq(generatedFiles.generationId, pending.id));
    return {
      id: pending.id, analysisId, teamId, framework, language,
      usedImprovedVersion: useImprovedVersion,
      llmProvider: gen?.llmProvider ?? '', llmModel: gen?.llmModel ?? '',
      promptVersion: gen?.promptVersion ?? '', files: files.map(f => ({ type: f.fileType as GeneratedFileResult['type'], filename: f.filename, content: f.content })),
      status: gen?.status ?? 'success', durationMs: gen?.durationMs ?? 0,
      createdAt: gen?.createdAt ?? new Date(),
    };
  }

  /**
   * Feature 008: Régénération incrémentale.
   * Charge le code existant d'une génération précédente + calcule le diff AC + appelle le LLM incrémental.
   */
  async processIncrementalGeneration(
    generationId: string,
    previousGenerationId: string,
    analysisId: string,
    teamId: string,
    framework: string,
    language: string,
  ): Promise<{ changePercent: number; recommendFullRegen: boolean }> {
    const startTime = Date.now();

    try {
      const analysis = await db.query.analyses.findFirst({
        where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
      });
      if (!analysis) throw new Error('Analysis not found');

      const story = await db.query.userStories.findFirst({
        where: and(eq(userStories.id, analysis.userStoryId!), eq(userStories.teamId, teamId)),
      });
      if (!story) throw new Error('User story not found');

      // Charger les fichiers de la génération précédente
      const previousFiles = await db
        .select()
        .from(generatedFiles)
        .where(eq(generatedFiles.generationId, previousGenerationId));

      if (previousFiles.length === 0) throw new Error('No previous files to base incremental generation on');

      // Charger le source_hash de la génération précédente pour reconstruire le diff
      const [prevGen] = await db
        .select({ sourceHash: generations.sourceHash })
        .from(generations)
        .where(eq(generations.id, previousGenerationId))
        .limit(1);

      // Calculer le diff AC (approximation : on compare le hash stocké avec le contenu actuel)
      // En v1, on ne stocke pas l'ancien AC → on fait un diff symbolique
      const currentAC = story.acceptanceCriteria;
      const diff = diffAcceptanceCriteria(null, currentAC); // simplified: treat all as new if no old stored
      const changePercent = prevGen?.sourceHash ? diff.changePercent : 50; // default 50% if unknown
      const recommendFullRegen = changePercent >= 60;

      // Charger config LLM
      const llmConfig = await db.query.llmConfigs.findFirst({
        where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
      });
      if (!llmConfig) throw new Error('No LLM config found');

      const client = createLLMClient({
        provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
        model: llmConfig.model,
        apiKey: decrypt(llmConfig.encryptedApiKey),
        ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
        ...(llmConfig.azureDeployment ? { azureDeployment: llmConfig.azureDeployment } : {}),
        ...(llmConfig.ollamaEndpoint ? { ollamaEndpoint: llmConfig.ollamaEndpoint } : {}),
      });

      const existingFileResults: GeneratedFileResult[] = previousFiles.map((f) => ({
        type: f.fileType as GeneratedFileResult['type'],
        filename: f.filename,
        content: f.content,
      }));

      const diffText = formatDiffForPrompt({
        added: currentAC ? [currentAC] : [],
        removed: [],
        modified: [],
        unchanged: [],
        changePercent,
      });

      const userPrompt = buildIncrementalPrompt(existingFileResults, diffText, story.title, changePercent);

      const response = await client.complete(
        [
          { role: 'system', content: INCREMENTAL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1, jsonMode: true, maxTokens: 16000 },
      );

      const parsedFiles = this.parseFiles(response.content);

      if (parsedFiles.length > 0) {
        await db.insert(generatedFiles).values(
          parsedFiles.map((f) => ({ generationId, fileType: f.type, filename: f.filename, content: f.content })),
        );
      }

      await db
        .update(generations)
        .set({ status: 'success', durationMs: Date.now() - startTime, promptVersion: INCREMENTAL_PROMPT_VERSION })
        .where(eq(generations.id, generationId));

      return { changePercent, recommendFullRegen };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Incremental generation failed';
      await db
        .update(generations)
        .set({ status: 'error', errorMessage: message, durationMs: Date.now() - startTime })
        .where(eq(generations.id, generationId));
      throw err;
    }
  }

  /** Génère un ZIP en mémoire contenant tous les fichiers */
  async buildZip(files: GeneratedFileResult[]): Promise<Buffer> {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.filename, file.content);
    }
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  /** Feature 004: Self-healing — tente de corriger les erreurs avec le LLM (max 2 retries) */
  private async selfHeal(
    files: GeneratedFileResult[],
    errors: FileError[],
    client: LLMClient,
    maxRetries = 2,
  ): Promise<{
    files: GeneratedFileResult[];
    status: 'auto_corrected' | 'has_errors';
    attempts: number;
    remainingErrors: FileError[];
  }> {
    const validator = new CodeValidator();
    let currentFiles = [...files];
    let currentErrors = [...errors];
    let attempts = 0;

    // Grouper les erreurs par fichier
    const errorsByFile = new Map<string, FileError[]>();
    for (const error of currentErrors) {
      const existing = errorsByFile.get(error.filename) ?? [];
      errorsByFile.set(error.filename, [...existing, error]);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (currentErrors.length === 0) break;
      attempts++;

      // Corriger chaque fichier en erreur
      const correctedFiles = await Promise.all(
        currentFiles.map(async (file) => {
          const fileErrors = errorsByFile.get(file.filename);
          if (!fileErrors || fileErrors.length === 0) return file;

          const prompt = buildCorrectionPrompt(file.filename, file.content, fileErrors);
          try {
            const response = await client.complete(
              [{ role: 'user', content: prompt }],
              { temperature: 0.1, jsonMode: true, maxTokens: 4000 },
            );
            const parsed = JSON.parse(response.content) as { filename: string; content: string };
            if (parsed.content && parsed.filename === file.filename) {
              return { ...file, content: parsed.content };
            }
          } catch {
            // Correction échouée pour ce fichier — garder l'original
          }
          return file;
        }),
      );

      // Re-valider
      const revalidation = validator.validateFiles(correctedFiles);
      currentFiles = correctedFiles;
      currentErrors = revalidation.errors;
      errorsByFile.clear();
      for (const error of currentErrors) {
        const existing = errorsByFile.get(error.filename) ?? [];
        errorsByFile.set(error.filename, [...existing, error]);
      }

      if (revalidation.status === 'valid') break;
    }

    return {
      files: currentFiles,
      status: currentErrors.length === 0 ? 'auto_corrected' : 'has_errors',
      attempts,
      remainingErrors: currentErrors,
    };
  }

  /** Feature 002: Construit la section "Linked Manual Test Cases" pour le prompt */
  private async buildManualTestsSection(manualTestSetId: string): Promise<string | null> {
    try {
      const cases = await db
        .select()
        .from(manualTestCases)
        .where(eq(manualTestCases.manualTestSetId, manualTestSetId))
        .orderBy(manualTestCases.sortOrder);

      if (cases.length === 0) return null;

      const lines: string[] = ['## Linked Manual Test Cases', ''];
      lines.push('The generated tests MUST reference these manual test IDs:');
      lines.push('');

      for (const tc of cases) {
        const id = tc.externalId ?? tc.id;
        lines.push(`Test Case: ${id} - ${tc.title}`);
        const steps = (tc.steps ?? []) as Array<{ stepNumber: number; action: string; expectedResult: string }>;
        for (const s of steps) {
          lines.push(`  Step ${s.stepNumber}: ${s.action} → ${s.expectedResult}`);
        }
        lines.push('');
      }

      lines.push('In the generated test spec, for each test case:');
      lines.push('- Add the ID as a describe/test tag: e.g., test.describe(\'@XRAY-123\') or @Tag(\'XRAY-123\')');
      lines.push('- Reference the ID in a comment at the top of the test function');

      return lines.join('\n');
    } catch {
      return null;
    }
  }

  // V2: récupère le template POM de l'équipe pour un combo framework+language
  async getPomTemplate(teamId: string, framework: string, language: string): Promise<string | null> {
    const [template] = await db
      .select({ content: pomTemplates.content })
      .from(pomTemplates)
      .where(and(eq(pomTemplates.teamId, teamId), eq(pomTemplates.framework, framework), eq(pomTemplates.language, language)))
      .limit(1);
    return template?.content ?? null;
  }

  /** Parse robuste de la réponse JSON du LLM */
  private parseFiles(content: string): GeneratedFileResult[] {
    let raw: Record<string, unknown>;

    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      // Tenter d'extraire le JSON si le LLM a ajouté du texte autour
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('LLM response is not valid JSON');
      try {
        raw = JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        // La réponse est tronquée (maxTokens atteint)
        throw new Error('La réponse du LLM est incomplète (limite de tokens atteinte). Réessayez ou utilisez un modèle avec une plus grande fenêtre de contexte.');
      }
    }

    const rawFiles = Array.isArray(raw['files']) ? raw['files'] : [];

    const validTypes = new Set(['page_object', 'test_spec', 'fixtures']);

    return rawFiles
      .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
      .map((f) => ({
        type: (validTypes.has(f['type'] as string) ? f['type'] : 'test_spec') as GeneratedFileResult['type'],
        filename: typeof f['filename'] === 'string' ? f['filename'] : 'generated/unknown.ts',
        content: typeof f['content'] === 'string' ? f['content'] : '',
      }))
      .filter((f) => f.content.length > 0);
  }
}
