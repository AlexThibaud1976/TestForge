import type { UserStory } from '@testforge/shared-types';

export interface JiraCredentials {
  baseUrl: string;   // ex: https://acme.atlassian.net
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface JiraProject {
  key: string;
  name: string;
  id: string;
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: JiraDescription | null;
    assignee?: { displayName: string } | null;
    status?: { name: string } | null;
    labels?: string[];
    customfield_10016?: string | null; // Story points
    [key: string]: unknown;
  };
}

interface JiraDescription {
  type: string;
  content?: JiraDescriptionNode[];
}

interface JiraDescriptionNode {
  type: string;
  text?: string;
  content?: JiraDescriptionNode[];
}

export class JiraConnector {
  private baseUrl: string;
  private authHeader: string;
  private projectKey: string;

  constructor(credentials: JiraCredentials) {
    this.baseUrl = credentials.baseUrl.replace(/\/$/, '');
    this.authHeader =
      'Basic ' + Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString('base64');
    this.projectKey = credentials.projectKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/rest/api/3${path}`, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Jira API error ${res.status}: ${body || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Teste la connexion — lève une erreur si les credentials sont invalides */
  async testConnection(): Promise<void> {
    await this.fetch('/myself');
  }

  /** Liste les projets accessibles */
  async listProjects(): Promise<JiraProject[]> {
    const data = await this.fetch<{ values: JiraProject[] }>('/project/search?maxResults=50');
    return data.values;
  }

  /**
   * Importe les user stories du projet (type Story, maxResults = 100).
   * Délai de 100ms entre les pages pour respecter le rate limit Jira (10 req/sec).
   */
  async fetchUserStories(teamId: string, connectionId: string): Promise<Omit<UserStory, 'id'>[]> {
    const stories: Omit<UserStory, 'id'>[] = [];
    let startAt = 0;
    const maxResults = 100;
    let total = Infinity;

    while (startAt < total) {
      const jql = encodeURIComponent(
        `project = "${this.projectKey}" AND issuetype = Story ORDER BY created DESC`,
      );
      const data = await this.fetch<{ issues: JiraIssue[]; total: number; startAt: number }>(
        `/search/jql?jql=${jql}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,status,labels,assignee`,
      );

      total = data.total;

      for (const issue of data.issues) {
        stories.push({
          teamId,
          connectionId,
          externalId: issue.key,
          title: issue.fields.summary,
          description: this.extractText(issue.fields.description),
          acceptanceCriteria: null, // Jira Cloud stocke les AC dans la description ou un custom field
          labels: issue.fields.labels ?? [],
          status: issue.fields.status?.name ?? '',
          fetchedAt: new Date().toISOString(),
        });
      }

      startAt += data.issues.length;

      // Respecter le rate limit Jira
      if (startAt < total) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return stories;
  }

  // V2: Writeback — met à jour description et/ou acceptance criteria dans Jira
  async updateStory(
    externalId: string,
    fields: { description?: string; acceptanceCriteria?: string },
  ): Promise<void> {
    const updateFields: Record<string, unknown> = {};

    if (fields.description !== undefined) {
      updateFields['description'] = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: fields.description }] }],
      };
    }

    // Acceptance Criteria est un champ custom — tenter customfield_10016 (story points) n'est pas AC
    // On utilise la convention Jira Cloud : champ texte dans les fields si disponible
    if (fields.acceptanceCriteria !== undefined) {
      // Note: le nom exact du champ AC dépend de la configuration Jira de chaque équipe
      // Le champ le plus courant est 'customfield_10016' mais varie selon les instances
      // On met à jour 'description' avec AC appendé si le champ custom n'est pas connu
      if (updateFields['description']) {
        const existingDesc = (updateFields['description'] as { content: unknown[] }).content;
        (updateFields['description'] as { content: unknown[] }).content = [
          ...existingDesc,
          { type: 'paragraph', content: [{ type: 'text', text: `\n\nCritères d'acceptance :\n${fields.acceptanceCriteria}` }] },
        ];
      }
    }

    const res = await fetch(`${this.baseUrl}/rest/api/3/issue/${externalId}`, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: updateFields }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Jira writeback error ${res.status}: ${body || res.statusText}`);
    }
  }

  /** Extrait le texte brut depuis le format Atlassian Document Format (ADF) */
  private extractText(doc: JiraDescription | null | undefined): string {
    if (!doc) return '';
    return this.extractNodeText(doc).trim();
  }

  private extractNodeText(node: JiraDescription | JiraDescriptionNode): string {
    if ('text' in node && typeof node.text === 'string') return node.text;
    if (!node.content) return '';
    return node.content.map((child) => this.extractNodeText(child)).join(' ');
  }
}
