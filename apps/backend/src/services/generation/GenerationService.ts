import JSZip from 'jszip';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, generations, generatedFiles, llmConfigs, userStories, pomTemplates } from '../../db/schema.js';
import { createLLMClient } from '../llm/index.js';
import { decrypt } from '../../utils/encryption.js';
import { getPrompt } from './prompts/registry.js';

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
  ): Promise<{ id: string; analysisId: string; status: string }> {
    const analysis = await db.query.analyses.findFirst({
      where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
    });
    if (!analysis) throw new Error('Analysis not found');

    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) throw new Error('No default LLM configuration found for this team.');

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
  ): Promise<void> {
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

      const response = await client.complete(
        [
          { role: 'system', content: systemPromptWithTemplate },
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

      const files = this.parseFiles(response.content);

      if (files.length > 0) {
        await db.insert(generatedFiles).values(
          files.map((f) => ({
            generationId,
            fileType: f.type,
            filename: f.filename,
            content: f.content,
          })),
        );
      }

      // Mise à jour status → Realtime push au frontend
      await db
        .update(generations)
        .set({ status: 'success', durationMs: Date.now() - startTime })
        .where(eq(generations.id, generationId));

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      await db
        .update(generations)
        .set({ status: 'error', errorMessage: message, durationMs: Date.now() - startTime })
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

  /** Génère un ZIP en mémoire contenant tous les fichiers */
  async buildZip(files: GeneratedFileResult[]): Promise<Buffer> {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.filename, file.content);
    }
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
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
