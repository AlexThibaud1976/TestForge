import { db } from '../../db/index.js';
import { gitConfigs, gitPushes, generations, generatedFiles, userStories, analyses } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { decrypt } from '../../utils/encryption.js';
// Adapters importés dynamiquement pour éviter les problèmes ESM/CJS avec azure-devops-node-api
import type { GeneratedFile } from '../generation/GenerationService.js';

export interface PushOptions {
  generationId: string;
  teamId: string;
  gitConfigId: string;
  mode: 'commit' | 'pr';
  branchName?: string | undefined;
}

export interface PushRecord {
  id: string;
  mode: 'commit' | 'pr';
  branchName: string;
  commitSha: string | null;
  prUrl: string | null;
  status: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export class GitPushService {
  async push(options: PushOptions): Promise<PushRecord> {
    const { generationId, teamId, gitConfigId, mode } = options;

    // Load git config
    const [config] = await db
      .select()
      .from(gitConfigs)
      .where(eq(gitConfigs.id, gitConfigId))
      .limit(1);

    if (!config || config.teamId !== teamId) {
      throw new Error('Git config not found or not accessible');
    }

    // Load generation + files
    const [generation] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!generation || generation.teamId !== teamId) {
      throw new Error('Generation not found');
    }

    const files = await db
      .select()
      .from(generatedFiles)
      .where(eq(generatedFiles.generationId, generationId));

    if (files.length === 0) throw new Error('No generated files found');

    // Build branch name
    const branchName = options.branchName ?? (await this.buildBranchName(generation.analysisId!));

    // Decrypt token
    const token = decrypt(config.encryptedToken);

    // Select adapter
    const adapter = await this.createAdapter(config.provider, token, config.repoUrl);

    // Insert pending push record
    const [pushRecord] = await db
      .insert(gitPushes)
      .values({
        generationId,
        gitConfigId,
        teamId,
        mode,
        branchName,
        status: 'pending',
      })
      .returning();

    try {
      const result = await adapter.pushFiles(
        files as unknown as GeneratedFile[],
        branchName,
        config.defaultBranch,
        mode,
      );

      const [updated] = await db
        .update(gitPushes)
        .set({
          status: 'success',
          commitSha: result.commitSha ?? null,
          prUrl: result.prUrl ?? null,
        })
        .where(eq(gitPushes.id, pushRecord!.id))
        .returning();

      return updated as PushRecord;
    } catch (err) {
      await db
        .update(gitPushes)
        .set({ status: 'error', errorMessage: (err as Error).message })
        .where(eq(gitPushes.id, pushRecord!.id));
      throw err;
    }
  }

  private async buildBranchName(analysisId: string): Promise<string> {
    const [analysis] = await db
      .select({ userStoryId: analyses.userStoryId })
      .from(analyses)
      .where(eq(analyses.id, analysisId))
      .limit(1);

    if (!analysis?.userStoryId) return `testforge/generated-${Date.now()}`;

    const [story] = await db
      .select({ externalId: userStories.externalId, title: userStories.title })
      .from(userStories)
      .where(eq(userStories.id, analysis.userStoryId))
      .limit(1);

    if (!story) return `testforge/generated-${Date.now()}`;

    return `testforge/US-${story.externalId}-${slugify(story.title)}`;
  }

  private async createAdapter(provider: string, token: string, repoUrl: string) {
    switch (provider) {
      case 'github': {
        const { GitHubAdapter } = await import('./GitHubAdapter.js');
        return new GitHubAdapter(token, repoUrl);
      }
      case 'gitlab': {
        const { GitLabAdapter } = await import('./GitLabAdapter.js');
        return new GitLabAdapter(token, repoUrl);
      }
      case 'azure_repos': {
        const { AzureReposAdapter } = await import('./AzureReposAdapter.js');
        return new AzureReposAdapter(token, repoUrl);
      }
      default:
        throw new Error(`Unsupported Git provider: ${provider}`);
    }
  }
}
