import { Octokit } from '@octokit/rest';
import type { GeneratedFile } from '../generation/GenerationService.js';

export interface GitPushResult {
  branchName: string;
  commitSha?: string | undefined;
  prUrl?: string | undefined;
}

export class GitHubAdapter {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, repoUrl: string) {
    this.octokit = new Octokit({ auth: token });
    const match = repoUrl.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (!match) throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
    this.owner = match[1]!;
    this.repo = match[2]!;
  }

  async testConnection(): Promise<{ ok: boolean; repoName: string; defaultBranch: string }> {
    const { data } = await this.octokit.repos.get({ owner: this.owner, repo: this.repo });
    return { ok: true, repoName: data.full_name, defaultBranch: data.default_branch };
  }

  async pushFiles(
    files: GeneratedFile[],
    branchName: string,
    baseBranch: string,
    mode: 'commit' | 'pr',
  ): Promise<GitPushResult> {
    // Get base branch SHA
    const { data: ref } = await this.octokit.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${baseBranch}`,
    });
    const baseSha = ref.object.sha;

    // Get base tree SHA
    const { data: baseCommit } = await this.octokit.git.getCommit({
      owner: this.owner,
      repo: this.repo,
      commit_sha: baseSha,
    });

    // Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await this.octokit.git.createBlob({
          owner: this.owner,
          repo: this.repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return { path: file.filename, mode: '100644' as const, type: 'blob' as const, sha: blob.sha };
      }),
    );

    // Create tree
    const { data: tree } = await this.octokit.git.createTree({
      owner: this.owner,
      repo: this.repo,
      base_tree: baseCommit.tree.sha,
      tree: treeItems,
    });

    // Create commit
    const { data: commit } = await this.octokit.git.createCommit({
      owner: this.owner,
      repo: this.repo,
      message: `test: add generated tests for ${branchName.split('/').pop()}`,
      tree: tree.sha,
      parents: [baseSha],
    });

    // Create branch ref
    await this.octokit.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branchName}`,
      sha: commit.sha,
    });

    if (mode === 'commit') {
      return { branchName, commitSha: commit.sha };
    }

    // Create PR
    const { data: pr } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: `[TestForge] Generated tests — ${branchName.split('/').pop()}`,
      head: branchName,
      base: baseBranch,
      body: 'Tests auto-générés par TestForge depuis une user story.',
    });

    return { branchName, commitSha: commit.sha, prUrl: pr.html_url };
  }
}
