import * as azdev from 'azure-devops-node-api';
import type { GeneratedFile } from '../generation/GenerationService.js';
import type { GitPushResult } from './GitHubAdapter.js';

export class AzureReposAdapter {
  private orgUrl: string;
  private token: string;
  private project: string;
  private repoName: string;

  constructor(token: string, repoUrl: string) {
    this.token = token;
    // repoUrl format: https://dev.azure.com/{org}/{project}/_git/{repo}
    const match = repoUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/(.+?)(?:\.git)?$/);
    if (!match) throw new Error(`Invalid Azure Repos URL: ${repoUrl}`);
    this.orgUrl = `https://dev.azure.com/${match[1]}`;
    this.project = match[2]!;
    this.repoName = match[3]!;
  }

  private async getGitApi() {
    const authHandler = azdev.getPersonalAccessTokenHandler(this.token);
    const connection = new azdev.WebApi(this.orgUrl, authHandler);
    return connection.getGitApi();
  }

  async testConnection(): Promise<{ ok: boolean; repoName: string; defaultBranch: string }> {
    const gitApi = await this.getGitApi();
    const repo = await gitApi.getRepository(this.repoName, this.project);
    return {
      ok: true,
      repoName: repo.name ?? this.repoName,
      defaultBranch: repo.defaultBranch?.replace('refs/heads/', '') ?? 'main',
    };
  }

  async pushFiles(
    files: GeneratedFile[],
    branchName: string,
    baseBranch: string,
    mode: 'commit' | 'pr',
  ): Promise<GitPushResult> {
    const gitApi = await this.getGitApi();
    const repo = await gitApi.getRepository(this.repoName, this.project);
    const repoId = repo.id!;

    // Get base branch object ID
    const refs = await gitApi.getRefs(repoId, this.project, `heads/${baseBranch}`);
    const baseObjectId = refs[0]?.objectId;
    if (!baseObjectId) throw new Error(`Base branch '${baseBranch}' not found`);

    const pushResult = await gitApi.createPush(
      {
        refUpdates: [{ name: `refs/heads/${branchName}`, oldObjectId: '0000000000000000000000000000000000000000' }],
        commits: [
          {
            comment: `test: add generated tests for ${branchName.split('/').pop()}`,
            changes: files.map((file) => ({
              changeType: 1, // Add
              item: { path: `/${file.filename}` },
              newContent: { content: file.content, contentType: 0 },
            })),
          },
        ],
      },
      repoId,
      this.project,
    );

    const commitSha = pushResult.commits?.[0]?.commitId;

    if (mode === 'commit') {
      return { branchName, commitSha };
    }

    // Create pull request
    const pr = await gitApi.createPullRequest(
      {
        title: `[TestForge] Generated tests — ${branchName.split('/').pop()}`,
        description: 'Tests auto-générés par TestForge depuis une user story.',
        sourceRefName: `refs/heads/${branchName}`,
        targetRefName: `refs/heads/${baseBranch}`,
      },
      repoId,
      this.project,
    );

    return {
      branchName,
      commitSha,
      prUrl: `${this.orgUrl}/${this.project}/_git/${this.repoName}/pullrequest/${pr.pullRequestId}`,
    };
  }
}
