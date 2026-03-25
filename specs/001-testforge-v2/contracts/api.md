# API Contracts — TestForge V2

**Branch**: `001-testforge-v2` | **Date**: 2026-03-25

Tous les endpoints suivent les conventions V1 :
- Auth : header `Authorization: Bearer <supabase-jwt>`
- Erreurs : `{ error: string }`
- Pagination : `{ data: [], total, page, limit }` quand applicable

---

## Git Configs — `/api/git-configs`

### GET `/api/git-configs`
Liste les configs Git de l'équipe.

**Response 200**
```json
[
  {
    "id": "uuid",
    "provider": "github",
    "name": "Repo Tests E2E",
    "repoUrl": "https://github.com/org/repo",
    "defaultBranch": "main",
    "createdAt": "2026-04-01T10:00:00Z"
  }
]
```

### POST `/api/git-configs`
**Plan requis**: Pro

**Body**
```json
{
  "provider": "github",
  "name": "Repo Tests E2E",
  "repoUrl": "https://github.com/org/repo",
  "token": "ghp_xxxx",
  "defaultBranch": "main"
}
```
**Response 201**: objet GitConfig créé (sans token)

### POST `/api/git-configs/:id/test`
Teste la connexion au repo.

**Response 200**
```json
{ "ok": true, "repoName": "org/repo", "defaultBranch": "main" }
```

### DELETE `/api/git-configs/:id`
**Response 204**

---

## Git Push — `/api/generations/:id/push`

### POST `/api/generations/:id/push`
**Plan requis**: Pro

**Body**
```json
{
  "gitConfigId": "uuid",
  "mode": "pr",
  "branchName": "testforge/US-42-login-tests"
}
```
> `branchName` optionnel — auto-généré si absent : `testforge/US-{externalId}-{slug}`

**Response 201**
```json
{
  "id": "uuid",
  "mode": "pr",
  "branchName": "testforge/US-42-login-tests",
  "prUrl": "https://github.com/org/repo/pull/12",
  "commitSha": null,
  "status": "success"
}
```

### GET `/api/generations/:id/push-history`
**Response 200**: liste des `git_pushes` de la génération

---

## Writeback — `/api/analyses/:id/writeback`

### POST `/api/analyses/:id/writeback`
**Plan requis**: Pro

**Body**
```json
{
  "fields": ["description", "acceptanceCriteria"]
}
```
> `fields` optionnel — pousse les deux par défaut

**Response 200**
```json
{
  "id": "uuid",
  "sourceType": "jira",
  "contentBefore": "...",
  "contentAfter": "...",
  "createdAt": "2026-04-01T10:00:00Z"
}
```

### GET `/api/user-stories/:id/writeback-history`
**Response 200**: liste des entrées `writeback_history`

---

## Xray Configs — `/api/xray-configs`

### GET `/api/xray-configs`
**Response 200**: config Xray de l'équipe (null si non configurée)

### POST `/api/xray-configs`
**Plan requis**: Pro

**Body**
```json
{
  "projectKey": "PROJ",
  "clientId": "xray-client-id",
  "clientSecret": "xray-client-secret"
}
```
**Response 201**: XrayConfig créé (sans credentials)

### POST `/api/xray-configs/test`
Teste la connexion Xray (obtention du JWT).
**Response 200**: `{ "ok": true }`

### DELETE `/api/xray-configs/:id`
**Response 204**

---

## Xray Test Creation — `/api/generations/:id/xray`

### POST `/api/generations/:id/xray`
**Plan requis**: Pro

**Body**
```json
{
  "requirementKey": "PROJ-10"
}
```
> `requirementKey` optionnel — lien à l'US source (auto-détecté depuis `externalId` si absent)

**Response 201**
```json
{
  "id": "uuid",
  "xrayTestId": "456",
  "xrayTestKey": "PROJ-123",
  "createdAt": "2026-04-01T10:00:00Z"
}
```

---

## ADO Test Case Creation — `/api/generations/:id/ado-test-case`

### POST `/api/generations/:id/ado-test-case`
**Plan requis**: Pro

**Body**
```json
{
  "testPlanId": 789,
  "testSuiteId": 101
}
```
> `testPlanId` et `testSuiteId` optionnels — auto-détectés depuis le sprint de l'US si absents

**Response 201**
```json
{
  "id": "uuid",
  "testCaseId": 1234,
  "testSuiteId": 101,
  "testPlanId": 789,
  "createdAt": "2026-04-01T10:00:00Z"
}
```

---

## POM Templates — `/api/pom-templates`

### GET `/api/pom-templates`
**Response 200**: liste des templates de l'équipe

### POST `/api/pom-templates`
**Body**
```json
{
  "framework": "playwright",
  "language": "typescript",
  "content": "import { Page } from '@playwright/test';\n\nexport class BasePage {\n..."
}
```
**Response 201**: PomTemplate créé (upsert par `team_id + framework + language`)

### DELETE `/api/pom-templates/:id`
**Response 204**

---

## Super Admin — `/api/admin`

> Tous ces endpoints nécessitent le rôle `super_admin`.

### GET `/api/admin/teams`
Liste toutes les équipes.

**Query params**: `page`, `limit`, `search`, `plan`, `status` (active/trial/suspended)

**Response 200**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme QA",
      "plan": "pro",
      "suspendedAt": null,
      "memberCount": 5,
      "generationsThisMonth": 42,
      "trialEndsAt": null,
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

### GET `/api/admin/teams/:id`
Détail d'une équipe.

**Response 200**
```json
{
  "team": { "...": "..." },
  "members": [{ "userId": "...", "role": "admin", "joinedAt": "..." }],
  "recentGenerations": [{ "id": "...", "framework": "playwright", "status": "success", "createdAt": "..." }],
  "llmUsageThisMonth": { "openai": 15, "anthropic": 27 },
  "stripeStatus": "active"
}
```

### POST `/api/admin/teams/:id/suspend`
**Body**: `{ "reason": "string (optionnel)" }`
**Response 200**: `{ "suspendedAt": "timestamp" }`

### POST `/api/admin/teams/:id/reactivate`
**Response 200**: `{ "suspendedAt": null }`

### GET `/api/admin/stats`
Métriques globales.

**Response 200**
```json
{
  "totalTeams": 12,
  "activeTeams": 10,
  "trialTeams": 2,
  "suspendedTeams": 0,
  "totalGenerationsThisMonth": 387,
  "totalAnalysesThisMonth": 521
}
```
