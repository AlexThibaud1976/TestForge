# Quickstart — TestForge V2

**Branch**: `001-testforge-v2` | **Date**: 2026-03-25

Guide de démarrage rapide pour implémenter les features V2.

---

## Prérequis

- V1 MVP terminée et déployée (toutes les 6 phases)
- Node.js 20 LTS, pnpm, Vitest configurés
- Accès Supabase (projet `mwbborewrzosoviawmsd`)
- Stripe configuré (mode live post-démo Itecor)

## Variables d'environnement ajoutées

Aucune variable globale — les credentials sont stockés chiffrés en base par équipe.
Exception : `SUPER_ADMIN_SEED_USER_ID` (optionnel, pour le seed du premier super_admin).

## Dépendances npm à ajouter

```bash
# Backend
pnpm --filter backend add @octokit/rest        # GitHub API
pnpm --filter backend add @mistralai/mistralai  # Mistral AI
# GitLab : fetch natif (pas de SDK)
# Azure Repos : azure-devops-node-api déjà présent
# Ollama : openai SDK déjà présent (baseURL custom)
```

## Ordre d'implémentation recommandé

### Phase 0 — Infrastructure V2 (socle)
1. Écrire et appliquer les 10 migrations Drizzle (`data-model.md`)
2. Mettre à jour `apps/backend/src/db/schema.ts` avec les nouvelles tables
3. Créer le middleware `requireSuperAdmin` dans `apps/backend/src/middleware/superAdmin.ts`
4. Ajouter la suspension check dans le middleware auth existant : si `team.suspendedAt` non null → 403
5. Créer les skeletons de routes (réponses 501) : `git-configs`, `writeback`, `xray`, `pom-templates`, `admin`

### Phase 1 — Push Git
1. `apps/backend/src/services/git/GitHubAdapter.ts`
2. `apps/backend/src/services/git/GitLabAdapter.ts`
3. `apps/backend/src/services/git/AzureReposAdapter.ts`
4. `apps/backend/src/services/git/GitPushService.ts` (orchestrateur)
5. Routes `git-configs` + `POST /generations/:id/push`
6. Frontend : page `GitConfigPage.tsx` + composant `GitPushButton.tsx` sur `StoryDetailPage`

### Phase 2 — Writeback Jira/ADO
1. Ajouter méthodes write dans `JiraConnector` : `updateDescription()`, `updateAcceptanceCriteria()`
2. Ajouter méthodes write dans `ADOConnector` : `updateWorkItem()`
3. `apps/backend/src/services/writeback/WritebackService.ts`
4. Routes writeback
5. Frontend : composant `WritebackButton.tsx` sur l'onglet Analyse de `StoryDetailPage`

### Phase 3 — Xray + ADO Test Plans
1. `apps/backend/src/services/xray/XrayConnector.ts`
2. Étendre `ADOConnector` avec `TestPlansConnector` (méthodes Test Case)
3. Routes xray + ado-test-case
4. Frontend : boutons `XrayTestButton.tsx` + `ADOTestCaseButton.tsx` sur l'onglet Génération

### Phase 4 — Nouveaux frameworks
1. Créer les 6 fichiers de prompts dans `apps/backend/src/services/generation/prompts/`
   - `selenium-csharp.ts`, `selenium-ruby.ts`, `selenium-kotlin.ts`
   - `playwright-csharp.ts`, `cypress-js.ts`, `cypress-ts.ts`
2. Les enregistrer dans `registry.ts`
3. Aucun changement de route ou de schéma nécessaire

### Phase 5 — Mistral + Ollama
1. `apps/backend/src/services/llm/MistralAdapter.ts`
2. `apps/backend/src/services/llm/OllamaAdapter.ts` (wrapper OpenAI SDK avec baseURL)
3. Enregistrer dans la factory `createLLMClient()`
4. Migration `0003_add_llm_ollama_endpoint.sql`
5. Frontend : champs `ollamaEndpoint` dans `LLMConfigPage` + sélecteur de provider enrichi

### Phase 6 — Templates POM
1. Routes pom-templates (CRUD)
2. Modifier `GenerationService` : `getPomTemplate(teamId, framework, language)` + injection prompt
3. Frontend : page `PomTemplatesPage.tsx` sous `/settings/pom-templates`

### Phase 7 — Super Admin
1. Routes admin avec middleware `requireSuperAdmin`
2. Frontend : page `SuperAdminPage.tsx` sous `/super-admin`
3. Seed script : `pnpm --filter backend run seed:super-admin`

---

## Tests à écrire par phase

- **Phase 0** : tests d'intégration middleware suspension + super admin
- **Phase 1** : mock Octokit + GitLab fetch, unit tests `GitPushService`
- **Phase 2** : tests `JiraConnector.updateDescription()`, `ADOConnector.updateWorkItem()`
- **Phase 3** : mock Xray API, tests `XrayConnector.createTest()`
- **Phase 4** : snapshot tests des 6 nouveaux prompts (structure POM vérifiée)
- **Phase 5** : tests `MistralAdapter`, `OllamaAdapter` avec mocks HTTP
- **Phase 6** : test injection template dans `GenerationService`
- **Phase 7** : tests routes admin (403 sans super_admin, 200 avec)
