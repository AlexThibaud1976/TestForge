import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { analyses, userStories, llmConfigs, manualTestSets, manualTestCases, sourceConnections, xrayConfigs } from '../../db/schema.js';
import { XrayConnector } from '../xray/XrayConnector.js';
import { ADOConnector } from '../connectors/ADOConnector.js';
import { createLLMClient } from '../llm/index.js';
import { decrypt } from '../../utils/encryption.js';
import {
  MANUAL_TEST_PROMPT_VERSION,
  MANUAL_TEST_SYSTEM_PROMPT,
  buildManualTestUserPrompt,
} from './prompts/manual-test-v1.0.js';
import type {
  ManualTestCase,
  ManualTestStep,
  ExcludedCriterion,
  AnalysisSuggestion,
} from '@testforge/shared-types';

// ─── Types internes ────────────────────────────────────────────────────────────

interface LLMManualTestResponse {
  testCases: Array<{
    title: string;
    precondition: string | null;
    priority: string;
    category: string;
    steps: Array<{ action: string; expectedResult: string }>;
  }>;
  excludedCriteria: Array<{ criterion: string; reason: string }>;
}

export interface ManualTestSetResult {
  id: string;
  analysisId: string;
  teamId: string;
  userStoryId: string;
  status: string;
  usedImprovedVersion: boolean;
  version: number;
  testCases: ManualTestCase[];
  excludedCriteria: ExcludedCriterion[];
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  validatedAt: Date | null;
  validatedBy: string | null;
  pushedAt: Date | null;
  pushTarget: string | null;
  createdAt: Date;
  updatedAt: Date;
  lowScoreWarning?: boolean;
}

export interface UpdateTestCaseInput {
  id?: string | null | undefined;
  title: string;
  precondition?: string | null | undefined;
  priority: string;
  category: string;
  steps: Array<{ action: string; expectedResult: string }>;
  sortOrder?: number | undefined;
}

export interface PushResult {
  pushed: number;
  testCases: Array<{ id: string; externalId: string; externalUrl: string | null }>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ManualTestService {
  /**
   * Génère un lot de tests manuels depuis une analyse.
   */
  async generate(
    analysisId: string,
    teamId: string,
    useImprovedVersion: boolean,
  ): Promise<ManualTestSetResult> {
    const analysis = await db.query.analyses.findFirst({
      where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
    });
    if (!analysis) throw new Error('Analysis not found');

    const story = await db.query.userStories.findFirst({
      where: and(eq(userStories.id, analysis.userStoryId!), eq(userStories.teamId, teamId)),
    });
    if (!story) throw new Error('User story not found');

    const hasOriginalAC = story.acceptanceCriteria && story.acceptanceCriteria.trim().length > 0;
    const hasImprovedVersion = analysis.improvedVersion && analysis.improvedVersion.trim().length > 0;

    if (!hasOriginalAC && !hasImprovedVersion) {
      throw new Error(
        'Cette user story n\'a pas de critères d\'acceptance et aucune version améliorée. Lancez d\'abord une analyse.',
      );
    }

    // Si pas d'AC originaux mais une version améliorée disponible → forcer useImprovedVersion
    const effectiveUseImproved: boolean = Boolean(useImprovedVersion || (!hasOriginalAC && hasImprovedVersion));

    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) throw new Error('No default LLM configuration found for this team.');

    const client = createLLMClient({
      provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
      model: llmConfig.model,
      apiKey: decrypt(llmConfig.encryptedApiKey),
      ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
      ...(llmConfig.azureDeployment ? { azureDeployment: llmConfig.azureDeployment } : {}),
      ...(llmConfig.ollamaEndpoint ? { ollamaEndpoint: llmConfig.ollamaEndpoint } : {}),
    });

    const suggestions = (analysis.suggestions ?? []) as AnalysisSuggestion[];

    const response = await client.complete(
      [
        { role: 'system', content: MANUAL_TEST_SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildManualTestUserPrompt(
            story.title,
            story.description ?? '',
            story.acceptanceCriteria,
            suggestions,
            effectiveUseImproved,
            analysis.improvedVersion,
          ),
        },
      ],
      { temperature: 0.3, jsonMode: true, maxTokens: 4000 },
    );

    const parsed = this.parseResponse(response.content);

    // Persister le set
    const [set] = await db
      .insert(manualTestSets)
      .values({
        analysisId,
        teamId,
        userStoryId: story.id,
        usedImprovedVersion: effectiveUseImproved,
        version: 1,
        excludedCriteria: parsed.excludedCriteria,
        llmProvider: llmConfig.provider,
        llmModel: llmConfig.model,
        promptVersion: MANUAL_TEST_PROMPT_VERSION,
      })
      .returning();

    if (!set) throw new Error('Failed to persist manual test set');

    // Persister les cas de test
    const cases = await this.insertTestCases(set.id, teamId, parsed.testCases);

    return {
      ...this.setToResult(set),
      testCases: cases,
      lowScoreWarning: analysis.scoreGlobal < 40,
    };
  }

  /**
   * Retourne le dernier ManualTestSet pour une analyse.
   */
  async getByAnalysis(analysisId: string, teamId: string): Promise<ManualTestSetResult | null> {
    const set = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.analysisId, analysisId), eq(manualTestSets.teamId, teamId)),
      orderBy: [desc(manualTestSets.version)],
    });

    if (!set) return null;
    const cases = await this.loadTestCases(set.id);
    return { ...this.setToResult(set), testCases: cases };
  }

  /**
   * Met à jour les test cases d'un set (remplace tous les cases).
   */
  async update(
    setId: string,
    teamId: string,
    testCasesInput: UpdateTestCaseInput[],
  ): Promise<ManualTestSetResult> {
    const set = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.id, setId), eq(manualTestSets.teamId, teamId)),
    });
    if (!set) throw new Error('Manual test set not found');
    if (set.status === 'pushed') throw new Error('Cannot edit a pushed test set');

    // Supprimer tous les anciens cases et réinsérer
    await db.delete(manualTestCases).where(eq(manualTestCases.manualTestSetId, setId));

    const cases = await this.insertTestCases(
      setId,
      teamId,
      testCasesInput.map((tc, i) => ({
        title: tc.title,
        precondition: tc.precondition ?? null,
        priority: tc.priority,
        category: tc.category,
        steps: tc.steps,
        sortOrder: tc.sortOrder ?? i,
      })),
    );

    const [updated] = await db
      .update(manualTestSets)
      .set({ updatedAt: new Date() })
      .where(eq(manualTestSets.id, setId))
      .returning();

    return { ...this.setToResult(updated!), testCases: cases };
  }

  /**
   * Valide le lot de tests manuels.
   */
  async validate(setId: string, teamId: string, userId: string): Promise<ManualTestSetResult> {
    const set = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.id, setId), eq(manualTestSets.teamId, teamId)),
    });
    if (!set) throw new Error('Manual test set not found');

    const [updated] = await db
      .update(manualTestSets)
      .set({ status: 'validated', validatedAt: new Date(), validatedBy: userId, updatedAt: new Date() })
      .where(eq(manualTestSets.id, setId))
      .returning();

    const cases = await this.loadTestCases(setId);
    return { ...this.setToResult(updated!), testCases: cases };
  }

  /**
   * Régénère un lot (incrémente la version, crée un nouveau set).
   */
  async regenerate(
    analysisId: string,
    teamId: string,
    useImprovedVersion: boolean,
  ): Promise<ManualTestSetResult> {
    // Récupérer la version courante
    const existing = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.analysisId, analysisId), eq(manualTestSets.teamId, teamId)),
      orderBy: [desc(manualTestSets.version)],
    });

    const newVersion = (existing?.version ?? 0) + 1;

    const analysis = await db.query.analyses.findFirst({
      where: and(eq(analyses.id, analysisId), eq(analyses.teamId, teamId)),
    });
    if (!analysis) throw new Error('Analysis not found');

    const story = await db.query.userStories.findFirst({
      where: and(eq(userStories.id, analysis.userStoryId!), eq(userStories.teamId, teamId)),
    });
    if (!story) throw new Error('User story not found');

    if (!story.acceptanceCriteria || story.acceptanceCriteria.trim().length === 0) {
      throw new Error('Cette user story n\'a pas de critères d\'acceptance.');
    }

    const llmConfig = await db.query.llmConfigs.findFirst({
      where: and(eq(llmConfigs.teamId, teamId), eq(llmConfigs.isDefault, true)),
    });
    if (!llmConfig) throw new Error('No default LLM configuration found.');

    const client = createLLMClient({
      provider: llmConfig.provider as 'openai' | 'azure_openai' | 'anthropic' | 'mistral' | 'ollama',
      model: llmConfig.model,
      apiKey: decrypt(llmConfig.encryptedApiKey),
      ...(llmConfig.azureEndpoint ? { azureEndpoint: llmConfig.azureEndpoint } : {}),
      ...(llmConfig.azureDeployment ? { azureDeployment: llmConfig.azureDeployment } : {}),
      ...(llmConfig.ollamaEndpoint ? { ollamaEndpoint: llmConfig.ollamaEndpoint } : {}),
    });

    const suggestions = (analysis.suggestions ?? []) as AnalysisSuggestion[];
    const response = await client.complete(
      [
        { role: 'system', content: MANUAL_TEST_SYSTEM_PROMPT },
        { role: 'user', content: buildManualTestUserPrompt(story.title, story.description ?? '', story.acceptanceCriteria, suggestions, useImprovedVersion, analysis.improvedVersion) },
      ],
      { temperature: 0.3, jsonMode: true, maxTokens: 4000 },
    );

    const parsed = this.parseResponse(response.content);

    const [set] = await db
      .insert(manualTestSets)
      .values({
        analysisId,
        teamId,
        userStoryId: story.id,
        usedImprovedVersion: useImprovedVersion,
        version: newVersion,
        excludedCriteria: parsed.excludedCriteria,
        llmProvider: llmConfig.provider,
        llmModel: llmConfig.model,
        promptVersion: MANUAL_TEST_PROMPT_VERSION,
      })
      .returning();

    if (!set) throw new Error('Failed to persist regenerated manual test set');

    const cases = await this.insertTestCases(set.id, teamId, parsed.testCases);
    return { ...this.setToResult(set), testCases: cases };
  }

  // ─── Push vers Xray ──────────────────────────────────────────────────────────

  async pushToXray(setId: string, teamId: string): Promise<PushResult> {
    const set = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.id, setId), eq(manualTestSets.teamId, teamId)),
    });
    if (!set) throw new Error('Manual test set not found');
    if (set.status === 'draft') throw new Error('Le lot doit être validé avant de pousser vers Xray');

    // Charger la connexion Jira source via la user story
    const [story] = await db
      .select({ connectionId: analyses.userStoryId })
      .from(analyses)
      .where(eq(analyses.id, set.analysisId))
      .limit(1);

    const [xrayConfig] = await db.select().from(xrayConfigs).where(eq(xrayConfigs.teamId, teamId)).limit(1);

    // Charger les credentials Xray depuis la connexion Jira ou depuis xray_configs
    let clientId: string;
    let clientSecret: string;
    let projectKey: string;
    let jiraAuthHeader: string | undefined;
    let jiraBaseUrl: string | undefined;

    // Chercher connexion Jira avec Xray configuré
    const jiraConn = await db
      .select()
      .from(sourceConnections)
      .where(and(eq(sourceConnections.teamId, teamId), eq(sourceConnections.type, 'jira')))
      .limit(1)
      .then((rows) => rows.find((r) => r.xrayClientId && r.xrayClientSecret) ?? rows[0]);

    if (jiraConn?.xrayClientId && jiraConn.xrayClientSecret) {
      clientId = jiraConn.xrayClientId;
      clientSecret = decrypt(jiraConn.xrayClientSecret);
      projectKey = jiraConn.projectKey;
      const jiraCreds = JSON.parse(decrypt(jiraConn.encryptedCredentials)) as { email: string; apiToken: string };
      jiraAuthHeader = 'Basic ' + Buffer.from(`${jiraCreds.email}:${jiraCreds.apiToken}`).toString('base64');
      jiraBaseUrl = jiraConn.baseUrl;
    } else if (xrayConfig) {
      const creds = JSON.parse(decrypt(xrayConfig.encryptedCredentials)) as { clientId: string; clientSecret: string };
      clientId = creds.clientId;
      clientSecret = creds.clientSecret;
      projectKey = xrayConfig.projectKey;
    } else {
      throw new Error('Aucune configuration Xray trouvée. Configurez Xray sur la connexion Jira.');
    }

    const connector = new XrayConnector({ clientId, clientSecret });
    const cases = await this.loadTestCasesRaw(setId);
    const results: PushResult['testCases'] = [];

    for (const tc of cases) {
      const steps = ((tc.steps ?? []) as Array<{ action: string; expectedResult: string }>).map((s) => ({
        action: s.action,
        result: s.expectedResult,
      }));

      let testKey: string;
      let testId: string;

      if (tc.externalId && tc.externalSource === 'xray') {
        // Idempotence : mettre à jour les steps si déjà pushé
        await connector.updateTestSteps(tc.externalId, steps).catch(() => undefined);
        testKey = tc.externalId;
        testId = tc.externalId;
      } else {
        const created = await connector.createTest({
          projectKey,
          summary: `[TestForge] ${tc.title}`,
          steps,
          jiraAuthHeader,
          jiraBaseUrl,
        });
        testKey = created.testKey;
        testId = created.testId;

        // Stocker l'ID externe
        await db
          .update(manualTestCases)
          .set({ externalId: testKey, externalUrl: null, externalSource: 'xray', updatedAt: new Date() })
          .where(eq(manualTestCases.id, tc.id));
      }

      results.push({ id: tc.id, externalId: testKey, externalUrl: null });
    }

    await db
      .update(manualTestSets)
      .set({ status: 'pushed', pushedAt: new Date(), pushTarget: 'xray', updatedAt: new Date() })
      .where(eq(manualTestSets.id, setId));

    return { pushed: results.length, testCases: results };
  }

  // ─── Push vers ADO Test Plans ─────────────────────────────────────────────

  async pushToADO(setId: string, teamId: string): Promise<PushResult> {
    const set = await db.query.manualTestSets.findFirst({
      where: and(eq(manualTestSets.id, setId), eq(manualTestSets.teamId, teamId)),
    });
    if (!set) throw new Error('Manual test set not found');
    if (set.status === 'draft') throw new Error('Le lot doit être validé avant de pousser vers ADO');

    const adoConn = await db
      .select()
      .from(sourceConnections)
      .where(and(eq(sourceConnections.teamId, teamId), eq(sourceConnections.type, 'azure_devops')))
      .limit(1)
      .then((rows) => rows[0]);

    if (!adoConn) throw new Error('Aucune connexion Azure DevOps configurée');

    const credentials = JSON.parse(decrypt(adoConn.encryptedCredentials)) as { pat: string };
    const ado = new ADOConnector({ organizationUrl: adoConn.baseUrl, project: adoConn.projectKey, pat: credentials.pat });

    const cases = await this.loadTestCasesRaw(setId);
    const results: PushResult['testCases'] = [];

    for (const tc of cases) {
      const steps = ((tc.steps ?? []) as Array<{ action: string; expectedResult: string }>).map((s) => ({
        action: s.action,
        expectedResult: s.expectedResult,
      }));

      let testCaseId: number;

      if (tc.externalId && tc.externalSource === 'ado') {
        // Idempotence : mettre à jour les steps
        await ado.updateTestCaseSteps(parseInt(tc.externalId, 10), steps).catch(() => undefined);
        testCaseId = parseInt(tc.externalId, 10);
      } else {
        testCaseId = await ado.createTestCase(`[TestForge] ${tc.title}`, steps);

        await db
          .update(manualTestCases)
          .set({ externalId: String(testCaseId), externalSource: 'ado', updatedAt: new Date() })
          .where(eq(manualTestCases.id, tc.id));
      }

      results.push({ id: tc.id, externalId: String(testCaseId), externalUrl: null });
    }

    await db
      .update(manualTestSets)
      .set({ status: 'pushed', pushedAt: new Date(), pushTarget: 'ado', updatedAt: new Date() })
      .where(eq(manualTestSets.id, setId));

    return { pushed: results.length, testCases: results };
  }

  // ─── Helpers privés ──────────────────────────────────────────────────────────

  private async insertTestCases(
    setId: string,
    teamId: string,
    rawCases: Array<{
      title: string;
      precondition?: string | null;
      priority: string;
      category: string;
      steps: Array<{ action: string; expectedResult: string }>;
      sortOrder?: number;
    }>,
  ): Promise<ManualTestCase[]> {
    if (rawCases.length === 0) return [];

    const VALID_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
    const VALID_CATEGORIES = new Set(['happy_path', 'error_case', 'edge_case', 'other']);

    const rows = rawCases.map((tc, i) => ({
      manualTestSetId: setId,
      teamId,
      title: tc.title || `Test case ${i + 1}`,
      precondition: tc.precondition ?? null,
      priority: VALID_PRIORITIES.has(tc.priority) ? tc.priority : 'medium',
      category: VALID_CATEGORIES.has(tc.category) ? tc.category : 'other',
      steps: tc.steps.map((s, si) => ({
        stepNumber: si + 1,
        action: s.action,
        expectedResult: s.expectedResult,
      })),
      sortOrder: tc.sortOrder ?? i,
    }));

    const inserted = await db.insert(manualTestCases).values(rows).returning();
    return inserted.map(this.caseToResult);
  }

  private async loadTestCasesRaw(setId: string) {
    return db
      .select()
      .from(manualTestCases)
      .where(eq(manualTestCases.manualTestSetId, setId))
      .orderBy(manualTestCases.sortOrder);
  }

  private async loadTestCases(setId: string): Promise<ManualTestCase[]> {
    const rows = await db
      .select()
      .from(manualTestCases)
      .where(eq(manualTestCases.manualTestSetId, setId))
      .orderBy(manualTestCases.sortOrder);
    return rows.map(this.caseToResult);
  }

  private parseResponse(content: string): LLMManualTestResponse {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(content) as Record<string, unknown>;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('LLM response is not valid JSON');
      raw = JSON.parse(match[0]) as Record<string, unknown>;
    }

    const rawCases = Array.isArray(raw['testCases']) ? raw['testCases'] : [];
    const rawExcluded = Array.isArray(raw['excludedCriteria']) ? raw['excludedCriteria'] : [];

    const testCases = rawCases
      .filter((tc): tc is Record<string, unknown> => typeof tc === 'object' && tc !== null)
      .map((tc) => ({
        title: typeof tc['title'] === 'string' ? tc['title'] : '',
        precondition: typeof tc['precondition'] === 'string' ? tc['precondition'] : null,
        priority: typeof tc['priority'] === 'string' ? tc['priority'] : 'medium',
        category: typeof tc['category'] === 'string' ? tc['category'] : 'other',
        steps: Array.isArray(tc['steps'])
          ? (tc['steps'] as Record<string, unknown>[]).map((s) => ({
              action: typeof s['action'] === 'string' ? s['action'] : '',
              expectedResult: typeof s['expectedResult'] === 'string' ? s['expectedResult'] : '',
            }))
          : [],
      }))
      .filter((tc) => tc.title && tc.steps.length > 0);

    const excludedCriteria = rawExcluded
      .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
      .map((e) => ({
        criterion: typeof e['criterion'] === 'string' ? e['criterion'] : '',
        reason: typeof e['reason'] === 'string' ? e['reason'] : '',
      }))
      .filter((e) => e.criterion);

    return { testCases, excludedCriteria };
  }

  private setToResult(row: typeof manualTestSets.$inferSelect): Omit<ManualTestSetResult, 'testCases'> {
    return {
      id: row.id,
      analysisId: row.analysisId,
      teamId: row.teamId,
      userStoryId: row.userStoryId,
      status: row.status,
      usedImprovedVersion: row.usedImprovedVersion,
      version: row.version,
      excludedCriteria: (row.excludedCriteria ?? []) as ExcludedCriterion[],
      llmProvider: row.llmProvider,
      llmModel: row.llmModel,
      promptVersion: row.promptVersion,
      validatedAt: row.validatedAt ?? null,
      validatedBy: row.validatedBy ?? null,
      pushedAt: row.pushedAt ?? null,
      pushTarget: row.pushTarget ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private caseToResult(row: typeof manualTestCases.$inferSelect): ManualTestCase {
    return {
      id: row.id,
      title: row.title,
      precondition: row.precondition ?? null,
      priority: row.priority as ManualTestCase['priority'],
      category: row.category as ManualTestCase['category'],
      steps: (row.steps ?? []) as ManualTestStep[],
      sortOrder: row.sortOrder,
      externalId: row.externalId ?? null,
      externalUrl: row.externalUrl ?? null,
      externalSource: (row.externalSource as ManualTestCase['externalSource']) ?? null,
    };
  }
}
