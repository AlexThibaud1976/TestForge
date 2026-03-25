import type { GeneratedFile } from '../generation/GenerationService.js';
import type { GitPushResult } from './GitHubAdapter.js';

export class GitLabAdapter {
  private baseUrl: string;
  private token: string;
  private projectId: string; // URL-encoded namespace/project

  constructor(token: string, repoUrl: string) {
    this.token = token;
    // Extract GitLab host + project path from URL
    const match = repoUrl.match(/^(https?:\/\/[^/]+)\/(.+?)(?:\.git)?$/);
    if (!match) throw new Error(`Invalid GitLab repo URL: ${repoUrl}`);
    this.baseUrl = match[1]!;
    this.projectId = encodeURIComponent(match[2]!);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/api/v4${path}`, {
      ...options,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitLab API error ${response.status}: ${text}`);
    }
    return response.json() as Promise<T>;
  }

  async testConnection(): Promise<{ ok: boolean; repoName: string; defaultBranch: string }> {
    const project = await this.request<{ name_with_namespace: string; default_branch: string }>(
      `/projects/${this.projectId}`,
    );
    return { ok: true, repoName: project.name_with_namespace, defaultBranch: project.default_branch };
  }

  async pushFiles(
    files: GeneratedFile[],
    branchName: string,
    baseBranch: string,
    mode: 'commit' | 'pr',
  ): Promise<GitPushResult> {
    // Create commit with all files in one request
    const actions = files.map((file) => ({
      action: 'create',
      file_path: file.filename,
      content: file.content,
    }));

    const commit = await this.request<{ id: string }>(
      `/projects/${this.projectId}/repository/commits`,
      {
        method: 'POST',
        body: JSON.stringify({
          branch: branchName,
          start_branch: baseBranch,
          commit_message: `test: add generated tests for ${branchName.split('/').pop()}`,
          actions,
        }),
      },
    );

    if (mode === 'commit') {
      return { branchName, commitSha: commit.id };
    }

    // Create merge request
    const mr = await this.request<{ web_url: string }>(
      `/projects/${this.projectId}/merge_requests`,
      {
        method: 'POST',
        body: JSON.stringify({
          source_branch: branchName,
          target_branch: baseBranch,
          title: `[TestForge] Generated tests — ${branchName.split('/').pop()}`,
          description: 'Tests auto-générés par TestForge depuis une user story.',
        }),
      },
    );

    return { branchName, commitSha: commit.id, prUrl: mr.web_url };
  }
}
