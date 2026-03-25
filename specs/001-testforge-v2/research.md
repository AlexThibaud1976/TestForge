# Research — TestForge V2

**Branch**: `001-testforge-v2` | **Date**: 2026-03-25

---

## 1. SDKs Git par provider

### GitHub
- **Decision**: `@octokit/rest` v20+
- **Rationale**: SDK officiel GitHub, TypeScript natif, le plus stable et le plus documenté. Supporte commits, branches, PRs via une API unifiée.
- **Alternatives écartées**: `simple-git` (trop bas niveau, pas de gestion des PR), `github-api` (abandonnée).
- **API cibles**: `git.createTree`, `git.createCommit`, `git.createRef`, `pulls.create`

### GitLab
- **Decision**: Appels REST directs via `fetch` (ou `node-fetch`) à l'API GitLab v4
- **Rationale**: `@gitbeaker/rest` ajoute ~500KB de dépendances et surcharge le bundle. L'API GitLab v4 est REST simple et bien documentée. Les endpoints nécessaires (commits, MR) sont stables.
- **Alternatives écartées**: `@gitbeaker/rest` (bundle trop lourd pour 3 endpoints), `node-gitlab` (obsolète).
- **API cibles**: `POST /projects/:id/repository/commits` (multi-action commit), `POST /projects/:id/merge_requests`

### Azure Repos (Git)
- **Decision**: Réutiliser `azure-devops-node-api` (déjà dans le projet pour ADOConnector)
- **Rationale**: La dépendance est déjà présente. Le SDK couvre le Git REST API v7.1 d'ADO (push, PR creation).
- **Clients**: `GitApi` du SDK pour les opérations Git

---

## 2. Xray Cloud API

- **Decision**: REST API Xray Cloud v2 avec authentification Client Credentials (client_id + client_secret → JWT)
- **Rationale**: L'API Xray Cloud v2 supporte la création de tests via `POST /rest/raven/1.0/import/test` avec un format JSON simple. L'authentification par JWT est stable et documentée.
- **Endpoint base**: `https://xray.cloud.getxray.app/api/v2/`
- **Création de test**: `POST /import/test` avec payload `XrayTestDefinition`
- **Lien requirement**: `POST /testcase/{testKey}/preconditions` ou via le champ `xray-requirement` dans le payload de création
- **Xray Server** (legacy): hors périmètre V2 — les credentials Cloud ne sont pas compatibles. À évaluer en V3.
- **Alternatives écartées**: GraphQL Xray (plus complexe, pas de gain fonctionnel pour notre usage)

---

## 3. ADO Test Plans

- **Decision**: Étendre `ADOConnector` existant avec les méthodes Test Plans
- **Rationale**: `azure-devops-node-api` inclut `TestApi` qui couvre la création de Test Cases, Test Suites et le lien aux work items. Réutiliser le client ADO existant évite une nouvelle configuration.
- **Méthodes SDK**: `testClient.createTestCase()`, `testClient.addTestCasesToSuite()`, work item `PATCH` pour lier à la User Story
- **Détection du sprint courant**: Via le champ `iteration` du work item User Story source (déjà stocké si présent, sinon `GET /wit/wiql` pour récupérer la sprint courante)

---

## 4. Mistral AI

- **Decision**: `@mistralai/mistralai` SDK officiel v1+
- **Rationale**: SDK TypeScript officiel, interface `chat.complete()` compatible avec l'architecture LLMClient existante. Supporte les modèles `mistral-large-latest`, `mistral-small-latest`.
- **Mapping LLMClient**: `messages` → `messages`, `maxTokens` → `maxTokens`, `temperature` → `temperature`
- **Particularités**: Pas de `system` role dans certains modèles — encapsuler en premier message `user` si nécessaire. Tester avec `mistral-large-latest` qui supporte `system`.
- **Modèles supportés V2**: `mistral-large-latest`, `mistral-small-latest` (les seuls stables à la date de planification)

---

## 5. Ollama

- **Decision**: Appels HTTP directs à l'API OpenAI-compatible d'Ollama (`/v1/chat/completions`)
- **Rationale**: Ollama expose une API 100% compatible OpenAI depuis la version 0.1.24+. On peut réutiliser `openai` SDK avec un `baseURL` custom, ce qui minimise le nouveau code.
- **Implementation**: `OllamaAdapter` = `OpenAIAdapter` avec `baseURL: ollamaEndpoint + '/v1'` et `apiKey: 'ollama'` (placeholder requis par le SDK OpenAI mais ignoré par Ollama)
- **Config supplémentaire**: `ollamaEndpoint` (URL HTTP, ex: `http://localhost:11434`) + `model` (nom du modèle local, ex: `llama3:8b`)
- **Alternatives écartées**: SDK natif Ollama `/api/chat` — interface différente, code dupliqué inutilement.

---

## 6. POM Templates — injection dans le prompt

- **Decision**: Injection dans le system prompt de génération via une section dédiée `## Team POM Template`
- **Rationale**: Le template est fourni comme exemple à imiter, pas comme contrainte stricte. Le LLM doit l'utiliser comme guide de style, pas le copier littéralement.
- **Format de stockage**: Texte libre (pas de DSL). L'équipe colle un exemple de page object existant.
- **Injection**: Si `pomTemplate` existe pour le couple `(framework, language)` de la génération, il est ajouté au system prompt après les instructions générales de génération.
- **Fallback**: Si pas de template, comportement V1 inchangé.

---

## 7. Super Admin — stockage du rôle

- **Decision**: Table dédiée `super_admins(user_id)` — séparée de `team_members`
- **Rationale**: Le rôle super_admin est un rôle système global, indépendant de toute appartenance à une équipe. Le mixer dans `team_members` créerait une ambiguïté (quel `team_id` associer ?). Une table dédiée est plus propre et facilite les vérifications de sécurité.
- **Attribution**: Insertion manuelle en base (pas d'UI self-service). Un seed script peut être fourni.
- **Middleware**: `requireSuperAdmin` — vérifie que `user_id` (du JWT Supabase) est présent dans `super_admins`. Différent de `requireAdmin` qui vérifie `team_members.role = 'admin'`.

---

## 8. Plan + Billing — features V2 sur plan Pro uniquement

- **Decision**: Les features Push Git, Writeback, Xray, ADO Test Plans sont réservées au plan Pro. Les nouveaux frameworks et LLM providers sont disponibles sur Starter et Pro.
- **Rationale**: Les intégrations (Git, Xray, ADO) requièrent la gestion de credentials externes et génèrent de la valeur enterprise — aligné avec le positionnement Pro. Les frameworks supplémentaires sont une extension naturelle des features de base, accessibles à tous.
- **Implementation**: Utiliser le middleware `plan.ts` existant avec des checks `requirePlan('pro')` sur les routes d'intégration.
