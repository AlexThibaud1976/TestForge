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

// ─── Feature 009: SyncFilters ─────────────────────────────────────────────────

export interface SyncFilters {
  sprint?: string;       // nom du sprint Jira (ex: "Sprint 14")
  statuses?: string[];   // ex: ["Ready", "In Progress"]
  labels?: string[];     // ex: ["ready-for-qa"]
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'closed' | 'future';
}

function buildJql(projectKey: string, filters?: SyncFilters): string {
  const clauses: string[] = [
    `project = "${projectKey}"`,
    'issuetype = Story',
  ];
  if (filters?.sprint) {
    clauses.push(`sprint = "${filters.sprint}"`);
  }
  if (filters?.statuses && filters.statuses.length > 0) {
    const statusList = filters.statuses.map((s) => `"${s}"`).join(', ');
    clauses.push(`status IN (${statusList})`);
  }
  if (filters?.labels && filters.labels.length > 0) {
    const labelList = filters.labels.map((l) => `"${l}"`).join(', ');
    clauses.push(`labels IN (${labelList})`);
  }
  return `${clauses.join(' AND ')} ORDER BY created DESC`;
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

  /** Feature 009: Liste les sprints d'un projet via l'API Agile Jira */
  async listSprints(): Promise<JiraSprint[]> {
    try {
      // Trouver le board du projet (API Agile — chemin différent de /rest/api/3)
      const boardsRes = await fetch(
        `${this.baseUrl}/rest/agile/1.0/board?projectKeyOrId=${this.projectKey}&maxResults=1`,
        { headers: { Authorization: this.authHeader, Accept: 'application/json' } },
      );
      if (!boardsRes.ok) return [];
      const boards = await boardsRes.json() as { values?: Array<{ id: number }> };
      if (!boards.values?.length) return [];

      const boardId = boards.values[0]!.id;
      const sprintsRes = await fetch(
        `${this.baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=20`,
        { headers: { Authorization: this.authHeader, Accept: 'application/json' } },
      );
      if (!sprintsRes.ok) return [];
      const data = await sprintsRes.json() as { values?: JiraSprint[] };
      return data.values ?? [];
    } catch {
      return []; // API Agile non disponible sur certaines instances
    }
  }

  /**
   * Importe les user stories du projet (type Story, maxResults = 100).
   * Accepte des filtres optionnels pour enrichir le JQL.
   */
  async fetchUserStories(
    teamId: string,
    connectionId: string,
    filters?: SyncFilters,
  ): Promise<Omit<UserStory, 'id'>[]> {
    const stories: Omit<UserStory, 'id'>[] = [];
    let startAt = 0;
    const maxResults = 100;
    let total = Infinity;

    while (startAt < total) {
      const jql = encodeURIComponent(buildJql(this.projectKey, filters));
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
  // Fix 012: acFieldId permet de cibler le bon custom field AC par instance
  async updateStory(
    externalId: string,
    fields: { description?: string; acceptanceCriteria?: string },
    acFieldId?: string | null,
  ): Promise<void> {
    const updateFields: Record<string, unknown> = {};

    if (fields.description !== undefined) {
      updateFields['description'] = {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: fields.description }] }],
      };
    }

    if (fields.acceptanceCriteria !== undefined) {
      if (acFieldId) {
        // Fix 012: utiliser le custom field configuré pour cette instance Jira
        updateFields[acFieldId] = fields.acceptanceCriteria;
      } else {
        // Fallback : append dans la description (comportement V1)
        console.warn('[JiraConnector] ac_field_id not configured — appending AC to description');
        if (updateFields['description']) {
          const existingDesc = (updateFields['description'] as { content: unknown[] }).content;
          (updateFields['description'] as { content: unknown[] }).content = [
            ...existingDesc,
            { type: 'paragraph', content: [{ type: 'text', text: `\n\nCritères d'acceptation :\n${fields.acceptanceCriteria}` }] },
          ];
        }
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
