import type { UserStory } from '@testforge/shared-types';

export interface ADOCredentials {
  organizationUrl: string; // ex: https://dev.azure.com/myorg
  project: string;
  pat: string;             // Personal Access Token
}

export interface ADOProject {
  id: string;
  name: string;
}

interface ADOWorkItemRef {
  id: number;
  url: string;
}

interface ADOWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string | null;
    'Microsoft.VSTS.Common.AcceptanceCriteria'?: string | null;
    'System.State'?: string | null;
    'System.Tags'?: string | null;
    'System.AreaPath'?: string | null;
    [key: string]: unknown;
  };
}

const API_VERSION = '7.1';

export class ADOConnector {
  private orgUrl: string;
  private project: string;
  private authHeader: string;

  constructor(credentials: ADOCredentials) {
    this.orgUrl = credentials.organizationUrl.replace(/\/$/, '');
    this.project = credentials.project;
    // ADO : Basic auth avec PAT encodé en base64 (username vide, password = PAT)
    this.authHeader =
      'Basic ' + Buffer.from(`:${credentials.pat}`).toString('base64');
  }

  private async fetch<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Azure DevOps API error ${res.status}: ${body || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Azure DevOps API error ${res.status}: ${text || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /** Teste la connexion — vérifie que le projet est accessible */
  async testConnection(): Promise<void> {
    await this.fetch(
      `${this.orgUrl}/${this.project}/_apis/wit/workitemtypes?api-version=${API_VERSION}`,
    );
  }

  /** Liste les projets de l'organisation */
  async listProjects(): Promise<ADOProject[]> {
    const data = await this.fetch<{ value: ADOProject[] }>(
      `${this.orgUrl}/_apis/projects?api-version=${API_VERSION}`,
    );
    return data.value;
  }

  /**
   * Importe les User Stories du projet via WIQL.
   * Récupère les champs : Title, Description, Acceptance Criteria, State, Tags.
   */
  async fetchUserStories(teamId: string, connectionId: string): Promise<Omit<UserStory, 'id'>[]> {
    // Étape 1 : WIQL query pour obtenir les IDs
    const wiqlResult = await this.post<{ workItems: ADOWorkItemRef[] }>(
      `${this.orgUrl}/${this.project}/_apis/wit/wiql?api-version=${API_VERSION}`,
      {
        query: `SELECT [System.Id] FROM WorkItems
                WHERE [System.TeamProject] = '${this.project}'
                  AND [System.WorkItemType] = 'User Story'
                  AND [System.State] <> 'Removed'
                ORDER BY [System.ChangedDate] DESC`,
      },
    );

    if (wiqlResult.workItems.length === 0) return [];

    // Étape 2 : batch fetch des détails (max 200 IDs par requête)
    const stories: Omit<UserStory, 'id'>[] = [];
    const batchSize = 200;

    for (let i = 0; i < wiqlResult.workItems.length; i += batchSize) {
      const batch = wiqlResult.workItems.slice(i, i + batchSize);
      const ids = batch.map((w) => w.id).join(',');

      const fields = [
        'System.Title',
        'System.Description',
        'Microsoft.VSTS.Common.AcceptanceCriteria',
        'System.State',
        'System.Tags',
      ].join(',');

      const data = await this.fetch<{ value: ADOWorkItem[] }>(
        `${this.orgUrl}/${this.project}/_apis/wit/workitems?ids=${ids}&fields=${fields}&api-version=${API_VERSION}`,
      );

      for (const item of data.value) {
        const tags = item.fields['System.Tags'];
        const labels = tags
          ? tags.split(';').map((t: string) => t.trim()).filter(Boolean)
          : [];

        stories.push({
          teamId,
          connectionId,
          externalId: String(item.id),
          title: item.fields['System.Title'],
          description: this.stripHtml(item.fields['System.Description'] ?? ''),
          acceptanceCriteria: this.stripHtml(
            item.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] ?? null,
          ),
          labels,
          status: item.fields['System.State'] ?? '',
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    return stories;
  }

  // V2: Writeback — met à jour un work item ADO via PATCH JSON Patch
  async updateWorkItem(
    workItemId: number,
    fields: { description?: string; acceptanceCriteria?: string },
  ): Promise<void> {
    const patch: { op: string; path: string; value: string }[] = [];

    if (fields.description !== undefined) {
      patch.push({ op: 'replace', path: '/fields/System.Description', value: fields.description });
    }
    if (fields.acceptanceCriteria !== undefined) {
      patch.push({
        op: 'replace',
        path: '/fields/Microsoft.VSTS.Common.AcceptanceCriteria',
        value: fields.acceptanceCriteria,
      });
    }

    const res = await fetch(
      `${this.orgUrl}/${this.project}/_apis/wit/workitems/${workItemId}?api-version=${API_VERSION}`,
      {
        method: 'PATCH',
        headers: { Authorization: this.authHeader, Accept: 'application/json', 'Content-Type': 'application/json-patch+json' },
        body: JSON.stringify(patch),
      },
    );
    if (!res.ok) throw new Error(`ADO updateWorkItem error ${res.status}: ${await res.text().catch(() => '')}`);
  }

  // V2: ADO Test Plans — crée un Test Case work item
  async createTestCase(
    title: string,
    steps: { action: string; expectedResult: string }[],
  ): Promise<number> {
    const stepsXml = steps
      .map(
        (s, i) =>
          `<step id="${i + 1}" type="ValidateStep"><parameterizedString isformatted="true">${s.action}</parameterizedString><parameterizedString isformatted="true">${s.expectedResult}</parameterizedString></step>`,
      )
      .join('');

    const res = await fetch(
      `${this.orgUrl}/${this.project}/_apis/wit/workitems/$Test%20Case?api-version=${API_VERSION}`,
      {
        method: 'POST',
        headers: { Authorization: this.authHeader, Accept: 'application/json', 'Content-Type': 'application/json-patch+json' },
        body: JSON.stringify([
          { op: 'add', path: '/fields/System.Title', value: title },
          { op: 'add', path: '/fields/Microsoft.VSTS.TCM.Steps', value: `<steps id="0" last="${steps.length}">${stepsXml}</steps>` },
        ]),
      },
    );
    if (!res.ok) throw new Error(`ADO createTestCase error ${res.status}: ${await res.text().catch(() => '')}`);
    const result = await res.json() as { id: number };
    return result.id;
  }

  // V2: ADO Test Plans — ajoute un test case à un test suite
  async addTestCaseToSuite(
    planId: number,
    suiteId: number,
    testCaseId: number,
  ): Promise<void> {
    const res = await fetch(
      `${this.orgUrl}/${this.project}/_apis/test/plans/${planId}/suites/${suiteId}/testcases/${testCaseId}?api-version=${API_VERSION}`,
      { method: 'POST', headers: { Authorization: this.authHeader, Accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(`ADO addTestCaseToSuite error ${res.status}`);
  }

  // V2: Met à jour les steps d'un Test Case ADO existant
  async updateTestCaseSteps(
    testCaseId: number,
    steps: { action: string; expectedResult: string }[],
  ): Promise<void> {
    const stepsXml = steps
      .map(
        (s, i) =>
          `<step id="${i + 1}" type="ValidateStep"><parameterizedString isformatted="true">${s.action}</parameterizedString><parameterizedString isformatted="true">${s.expectedResult}</parameterizedString></step>`,
      )
      .join('');

    const res = await fetch(
      `${this.orgUrl}/${this.project}/_apis/wit/workitems/${testCaseId}?api-version=${API_VERSION}`,
      {
        method: 'PATCH',
        headers: { Authorization: this.authHeader, Accept: 'application/json', 'Content-Type': 'application/json-patch+json' },
        body: JSON.stringify([
          { op: 'replace', path: '/fields/Microsoft.VSTS.TCM.Steps', value: `<steps id="0" last="${steps.length}">${stepsXml}</steps>` },
        ]),
      },
    );
    if (!res.ok) throw new Error(`ADO updateTestCaseSteps error ${res.status}`);
  }

  /** Supprime les balises HTML présentes dans les champs ADO (Description, AC) */
  private stripHtml(html: string | null): string {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
