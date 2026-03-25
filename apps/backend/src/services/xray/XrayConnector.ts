export interface XrayCredentials {
  clientId: string;
  clientSecret: string;
}

export interface XrayStep {
  action: string;
  result: string;
}

export interface XrayTestDefinition {
  projectKey: string;
  summary: string;
  steps: XrayStep[];
  requirementKey?: string;
  // Credentials Jira — si fournis, crée l'issue via l'API Jira (plus fiable que /import/test)
  jiraBaseUrl?: string | undefined;
  jiraAuthHeader?: string | undefined;
}

export interface XrayTestCreated {
  testId: string;
  testKey: string;
}

const XRAY_BASE = 'https://xray.cloud.getxray.app/api/v2';

export class XrayConnector {
  private credentials: XrayCredentials;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: XrayCredentials) {
    this.credentials = credentials;
  }

  async authenticate(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) return this.token;

    const res = await fetch(`${XRAY_BASE}/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Xray authentication failed: ${text}`);
    }

    this.token = (await res.json()) as string;
    this.tokenExpiry = Date.now() + 55 * 60 * 1000; // 55 minutes
    return this.token;
  }

  mapStepsFromAC(acceptanceCriteria: string): XrayStep[] {
    // Parse AC lines into Xray steps
    const lines = acceptanceCriteria
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    return lines.map((line) => {
      // Given/When/Then format
      const thenMatch = line.match(/Then\s+(.+)/i);
      const whenMatch = line.match(/When\s+(.+)/i);
      if (thenMatch && whenMatch) {
        return { action: whenMatch[1]!, result: thenMatch[1]! };
      }
      return { action: line, result: 'Vérifier que l\'action s\'est correctement exécutée' };
    });
  }

  async createTest(definition: XrayTestDefinition): Promise<XrayTestCreated> {
    const xrayToken = await this.authenticate();

    let testId: string;
    let testKey: string;

    if (definition.jiraBaseUrl && definition.jiraAuthHeader) {
      // Approche fiable : créer l'issue Jira de type "Test" via l'API Jira standard
      const issueRes = await fetch(`${definition.jiraBaseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: definition.jiraAuthHeader,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fields: {
            project: { key: definition.projectKey },
            summary: definition.summary,
            issuetype: { name: 'Test' },
          },
        }),
      });

      if (!issueRes.ok) {
        const text = await issueRes.text();
        throw new Error(`Jira Test issue creation failed: ${text}`);
      }

      const issue = await issueRes.json() as { id: string; key: string };
      testId = issue.id;
      testKey = issue.key;

      // Ajouter les test steps via l'API Xray
      for (const step of definition.steps) {
        await fetch(`${XRAY_BASE}/test/${testKey}/step`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${xrayToken}`,
          },
          body: JSON.stringify({ action: step.action, data: '', result: step.result }),
        }).catch(() => undefined); // steps non-bloquants
      }
    } else {
      // Fallback : endpoint Xray /import/test (format natif Xray Cloud v2)
      const payload = [{
        testtype: 'Manual',
        projectKey: definition.projectKey,
        summary: definition.summary,
        steps: definition.steps.map((s) => ({ action: s.action, data: '', result: s.result })),
      }];

      const res = await fetch(`${XRAY_BASE}/import/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xrayToken}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Xray test creation failed: ${text}`);
      }

      const raw = await res.json() as { id: string; key: string }[] | { id: string; key: string };
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data) throw new Error('Xray: no test created in response');
      testId = data.id;
      testKey = data.key;
    }

    // Lier à la requirement si fournie
    if (definition.requirementKey) {
      await this.linkToRequirement(testKey, definition.requirementKey, xrayToken);
    }

    return { testId, testKey };
  }

  private async linkToRequirement(testKey: string, requirementKey: string, token: string): Promise<void> {
    await fetch(`${XRAY_BASE}/testcase/${testKey}/preconditions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ requirement: requirementKey }),
    });
    // Ignore link errors — test creation itself succeeded
  }
}
