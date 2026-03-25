# Tasks: TestForge V2

**Input**: Design documents from `specs/001-testforge-v2/`
**Branch**: `001-testforge-v2`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅

**Organization**: Tâches groupées par user story — chaque story est indépendamment implémentable et testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Peut tourner en parallèle (fichiers différents, pas de dépendances incomplètes)
- **[Story]**: User story associée (US1–US8)
- Chemins absolus depuis la racine du repo

---

## Phase 1: Setup (Infrastructure V2)

**Purpose**: Installation des nouvelles dépendances et configuration de base

- [x] T001 Installer `@octokit/rest` dans `apps/backend/package.json` (`pnpm --filter backend add @octokit/rest`)
- [x] T002 [P] Installer `@mistralai/mistralai` dans `apps/backend/package.json` (`pnpm --filter backend add @mistralai/mistralai`)

---

## Phase 2: Foundational (Prérequis bloquants)

**Purpose**: Schéma DB, middleware super_admin, check suspension, routes skeleton — MUST be complete before any user story

**⚠️ CRITIQUE** : Aucune user story ne peut démarrer avant la fin de cette phase

- [x] T003 Ajouter les 8 nouvelles tables et 2 nouvelles colonnes dans `apps/backend/src/db/schema.ts` (tables : `gitConfigs`, `gitPushes`, `writebackHistory`, `xrayConfigs`, `xrayTests`, `adoTestCases`, `pomTemplates`, `superAdmins` ; colonnes : `teams.suspendedAt`, `llmConfigs.ollamaEndpoint`)
- [x] T004 [P] Créer migration `apps/backend/src/db/migrations/0002_add_teams_suspended_at.sql` (colonne `suspended_at timestamptz` sur `teams`)
- [x] T005 [P] Créer migration `apps/backend/src/db/migrations/0003_add_llm_ollama_endpoint.sql` (colonne `ollama_endpoint text` sur `llm_configs`)
- [x] T006 [P] Créer migration `apps/backend/src/db/migrations/0004_add_git_configs.sql` (table `git_configs`)
- [x] T007 [P] Créer migration `apps/backend/src/db/migrations/0005_add_git_pushes.sql` (table `git_pushes`)
- [x] T008 [P] Créer migration `apps/backend/src/db/migrations/0006_add_writeback_history.sql` (table `writeback_history`)
- [x] T009 [P] Créer migration `apps/backend/src/db/migrations/0007_add_xray_configs.sql` (table `xray_configs`, unique sur `team_id`)
- [x] T010 [P] Créer migration `apps/backend/src/db/migrations/0008_add_xray_tests.sql` (table `xray_tests`)
- [x] T011 [P] Créer migration `apps/backend/src/db/migrations/0009_add_ado_test_cases.sql` (table `ado_test_cases`)
- [x] T012 [P] Créer migration `apps/backend/src/db/migrations/0010_add_pom_templates.sql` (table `pom_templates`, unique sur `team_id + framework + language`)
- [x] T013 [P] Créer migration `apps/backend/src/db/migrations/0011_add_super_admins.sql` (table `super_admins`, unique sur `user_id`)
- [x] T014 Appliquer toutes les migrations sur le projet Supabase (`mwbborewrzosoviawmsd`) via `pnpm --filter backend db:push` ou Drizzle migrate
- [x] T015 Créer middleware `apps/backend/src/middleware/superAdmin.ts` — vérifie que le `userId` (JWT) est présent dans la table `super_admins`, retourne 403 sinon
- [x] T016 Modifier `apps/backend/src/middleware/auth.ts` — ajouter check `team.suspendedAt` : si non null → réponse 403 `{ error: 'account_suspended' }`
- [x] T017 [P] Créer les 5 fichiers de routes skeleton avec réponses 501 : `apps/backend/src/routes/git-configs.ts`, `apps/backend/src/routes/writeback.ts`, `apps/backend/src/routes/xray.ts`, `apps/backend/src/routes/pom-templates.ts`, `apps/backend/src/routes/admin.ts`
- [x] T018 Enregistrer les 5 nouvelles routes dans `apps/backend/src/index.ts` — préfixes : `/api/git-configs`, `/api/xray-configs`, `/api/pom-templates`, `/api/admin` ; **writeback sans préfixe dédié** : monter `routes/writeback.ts` directement sur `/api` (ses endpoints sont `/api/analyses/:id/writeback` et `/api/user-stories/:id/writeback-history`)

**Checkpoint** : `pnpm test` vert, migrations appliquées, routes skeleton retournent 501, check suspension actif.

---

## Phase 3: US1 — Push Git (Priority: P1) 🎯 MVP V2

**Goal**: Une équipe Pro configure un repo Git cible et pousse les fichiers générés en commit direct ou en PR depuis TestForge.

**Independent Test**: Configurer un repo GitHub de test → générer une US → pousser → vérifier branche + PR créées dans GitHub.

### Implémentation US1

- [x] T019 [P] [US1] Créer `apps/backend/src/services/git/GitHubAdapter.ts` — méthodes : `testConnection()`, `pushFiles(files, branchName, mode)` via `@octokit/rest` (`git.createTree`, `git.createCommit`, `git.createRef`, `pulls.create`)
- [x] T020 [P] [US1] Créer `apps/backend/src/services/git/GitLabAdapter.ts` — méthodes : `testConnection()`, `pushFiles(files, branchName, mode)` via fetch REST GitLab API v4 (`POST /repository/commits`, `POST /merge_requests`)
- [x] T021 [P] [US1] Créer `apps/backend/src/services/git/AzureReposAdapter.ts` — méthodes : `testConnection()`, `pushFiles(files, branchName, mode)` via `azure-devops-node-api` `GitApi` (`createPush`, `createPullRequest`)
- [x] T022 [US1] Créer `apps/backend/src/services/git/GitPushService.ts` — orchestrateur : sélectionne l'adapter selon `provider`, génère le nom de branche `testforge/US-{externalId}-{slug}`, appelle l'adapter, enregistre le résultat dans `git_pushes`
- [x] T023 [US1] Implémenter `apps/backend/src/routes/git-configs.ts` complet : `GET /`, `POST /`, `POST /:id/test`, `DELETE /:id` — chiffrer le token PAT avec AES-256-GCM avant stockage
- [x] T024 [US1] Ajouter route `POST /api/generations/:id/push` dans `apps/backend/src/routes/generations.ts` — plan Pro requis, appelle `GitPushService`
- [x] T025 [US1] Ajouter route `GET /api/generations/:id/push-history` dans `apps/backend/src/routes/generations.ts`
- [x] T026 [P] [US1] Créer `apps/frontend/src/pages/GitConfigPage.tsx` — formulaire CRUD git config (provider, repoUrl, token, defaultBranch) à `/settings/git`
- [x] T027 [US1] Créer `apps/frontend/src/components/GitPushButton.tsx` — bouton "Pousser vers Git" sur `StoryDetailPage` onglet Génération, dialog choix mode (commit/PR) + sélection config
- [x] T028 [US1] Ajouter route `/settings/git` dans `apps/frontend/src/App.tsx` + lien "Git" dans `AppLayout` sous Settings

**Checkpoint** : Push GitHub/GitLab/AzureRepos fonctionnel de bout en bout.

---

## Phase 4: US2 — Writeback Jira/ADO (Priority: P1)

**Goal**: Un PO peut pousser la version améliorée d'une US directement vers Jira ou ADO depuis l'onglet Analyse, après confirmation d'un diff.

**Independent Test**: Analyser une US Jira test → cliquer "Mettre à jour l'US" → confirmer → vérifier que la description et les AC sont mis à jour dans Jira.

### Implémentation US2

- [x] T029 [P] [US2] Ajouter méthode `updateStory(externalId: string, fields: { description?: string; acceptanceCriteria?: string })` dans `apps/backend/src/services/connectors/JiraConnector.ts` — `PUT /rest/api/3/issue/{issueId}` avec corps ADF
- [x] T030 [P] [US2] Ajouter méthode `updateWorkItem(id: number, fields: { description?: string; acceptanceCriteria?: string })` dans `apps/backend/src/services/connectors/ADOConnector.ts` — `PATCH /wit/workitems/{id}` avec JSON Patch
- [x] T031 [US2] Créer `apps/backend/src/services/writeback/WritebackService.ts` — détecte le type de connexion source (jira/azure_devops), délègue vers le bon connector, enregistre dans `writeback_history`
- [x] T032 [US2] Implémenter `apps/backend/src/routes/writeback.ts` complet : `POST /analyses/:id/writeback` (plan Pro, appelle WritebackService) + `GET /user-stories/:id/writeback-history`
- [x] T033 [US2] Créer `apps/frontend/src/components/WritebackButton.tsx` — bouton "Mettre à jour l'US" sur `StoryDetailPage` onglet Analyse, dialog avec diff avant/après + bouton confirmer

**Checkpoint** : Writeback Jira et ADO fonctionnels avec confirmation UI et historique.

---

## Phase 5: US3 — Intégration Xray (Priority: P1)

**Goal**: Un QA peut créer un test Xray lié à l'US source depuis une génération, avec les Test Steps dérivés des critères d'acceptance.

**Independent Test**: Générer une US avec des AC → cliquer "Créer test Xray" → vérifier le test dans Xray avec les steps et le lien requirement.

### Implémentation US3

- [x] T034 [US3] Créer `apps/backend/src/services/xray/XrayConnector.ts` — méthodes : `authenticate()` (POST Xray Cloud → JWT), `createTest(definition)` (POST /import/test), `mapStepsFromAC(acceptanceCriteria)` (parsing AC → steps Xray `{action, result}`)
- [x] T035 [US3] Implémenter `apps/backend/src/routes/xray.ts` — CRUD xray-configs uniquement : `GET /api/xray-configs`, `POST /api/xray-configs`, `POST /api/xray-configs/test`, `DELETE /api/xray-configs/:id`
- [x] T035b [US3] Ajouter route `POST /api/generations/:id/xray` dans `apps/backend/src/routes/generations.ts` (cohérence avec T024/T025 — plan Pro requis, appelle XrayConnector, stocke dans `xray_tests`)
- [x] T036 [US3] Créer `apps/frontend/src/components/XrayTestButton.tsx` — bouton "Créer test Xray" sur `StoryDetailPage` onglet Génération, affiche le lien `xrayTestKey` après création

**Checkpoint** : Test Xray créé avec steps depuis les AC, lié à l'US Jira source.

---

## Phase 6: US4 — Intégration ADO Test Plans (Priority: P1)

**Goal**: Un Tech Lead peut créer un Test Case ADO lié à la User Story source depuis une génération, rattaché au Test Suite du sprint courant.

**Independent Test**: Générer depuis une US ADO → cliquer "Créer Test Case ADO" → vérifier le Test Case créé dans ADO Test Plans avec les steps.

### Implémentation US4

- [x] T037 [US4] Étendre `apps/backend/src/services/connectors/ADOConnector.ts` — ajouter méthodes : `createTestCase(title, steps, workItemId)` via `TestApi.createTestCase()`, `addTestCaseToSuite(testPlanId, testSuiteId, testCaseId)`, `detectCurrentSprintSuite(projectId)` (via WIQL pour récupérer le sprint courant)
- [x] T038 [US4] Ajouter route `POST /api/generations/:id/ado-test-case` dans `apps/backend/src/routes/generations.ts` — plan Pro, appelle les méthodes Test Plans ADO, stocke dans `ado_test_cases`
- [x] T039 [US4] Créer `apps/frontend/src/components/ADOTestCaseButton.tsx` — bouton "Créer Test Case ADO" sur `StoryDetailPage` onglet Génération, affiche l'ID du Test Case créé

**Checkpoint** : Test Case ADO créé avec steps, lié à l'US et rattaché au Test Suite sprint.

---

## Phase 7: US5 — Nouveaux Frameworks (Priority: P2)

**Goal**: 6 nouvelles combinaisons framework/langage disponibles dans le sélecteur de génération — même qualité POM + fixtures.

**Independent Test**: Pour chaque combo, générer avec une US de référence (AC complètes) → vérifier que les 3 fichiers générés compilent et respectent le pattern POM.

### Implémentation US5

- [x] T040 [P] [US5] Créer `apps/backend/src/services/generation/prompts/selenium-csharp.ts` — system prompt Selenium C# avec NUnit, POM, fixtures JSON, données externalisées
- [x] T041 [P] [US5] Créer `apps/backend/src/services/generation/prompts/selenium-ruby.ts` — system prompt Selenium Ruby avec RSpec, Page Object pattern, fixtures YAML
- [x] T042 [P] [US5] Créer `apps/backend/src/services/generation/prompts/selenium-kotlin.ts` — system prompt Selenium Kotlin avec JUnit 5, POM, data classes pour fixtures
- [x] T043 [P] [US5] Créer `apps/backend/src/services/generation/prompts/playwright-csharp.ts` — system prompt Playwright C# avec NUnit/xUnit, POM, fixtures JSON
- [x] T044 [P] [US5] Créer `apps/backend/src/services/generation/prompts/cypress-js.ts` — system prompt Cypress JavaScript avec custom commands, Page Object, fixtures JSON
- [x] T045 [P] [US5] Créer `apps/backend/src/services/generation/prompts/cypress-ts.ts` — system prompt Cypress TypeScript avec typage strict, custom commands, POM, fixtures JSON
- [x] T046 [US5] Enregistrer les 6 nouvelles combinaisons dans `apps/backend/src/services/generation/prompts/registry.ts` (`selenium+csharp`, `selenium+ruby`, `selenium+kotlin`, `playwright+csharp`, `cypress+javascript`, `cypress+typescript`)
- [x] T047 [US5] Mettre à jour `apps/frontend/src/components/FrameworkSelector.tsx` — ajouter les 6 nouvelles options dans le sélecteur (label + value)

**Checkpoint** : Les 6 nouveaux combos apparaissent dans le sélecteur et génèrent du code compilable avec POM.

---

## Phase 8: US6 — Mistral + Ollama (Priority: P2)

**Goal**: Les équipes Pro peuvent configurer Mistral (cloud) ou Ollama (on-premise) comme provider LLM, avec la même interface que OpenAI/Anthropic.

**Independent Test**: Configurer Mistral → lancer une analyse → vérifier que le résultat est cohérent. Configurer Ollama → lancer une génération → vérifier le code produit.

### Implémentation US6

- [x] T048 [P] [US6] Créer `apps/backend/src/services/llm/MistralAdapter.ts` — implémente `LLMClient`, utilise `@mistralai/mistralai`, supporte `mistral-large-latest` et `mistral-small-latest`, gère l'absence de role `system` si nécessaire
- [x] T049 [P] [US6] Créer `apps/backend/src/services/llm/OllamaAdapter.ts` — implémente `LLMClient`, réutilise le SDK `openai` avec `baseURL: ollamaEndpoint + '/v1'` et `apiKey: 'ollama'`, passe le model name depuis la config
- [x] T050 [US6] Enregistrer Mistral et Ollama dans la factory `createLLMClient()` dans `apps/backend/src/services/llm/index.ts` (cases `'mistral'` et `'ollama'`)
- [x] T051 [US6] Mettre à jour `apps/frontend/src/pages/LLMConfigPage.tsx` — ajouter providers Mistral et Ollama dans le sélecteur, afficher le champ `ollamaEndpoint` (URL) conditionnel si provider = Ollama

**Checkpoint** : Analyse et génération fonctionnelles avec Mistral cloud. Ollama testable sur endpoint local.

---

## Phase 9: US7 — Templates POM Personnalisables (Priority: P2)

**Goal**: Chaque équipe peut définir un template de page object par framework/langage, injecté dans le prompt de génération.

**Independent Test**: Définir un template avec une classe de base `BasePage` → générer → vérifier que le code généré étend `BasePage`.

### Implémentation US7

- [x] T052 [US7] Implémenter `apps/backend/src/routes/pom-templates.ts` complet — `GET /`, `POST /` (upsert via `team_id + framework + language`), `DELETE /:id`
- [x] T053 [US7] Modifier `apps/backend/src/services/generation/GenerationService.ts` — ajouter méthode `getPomTemplate(teamId, framework, language)`, injecter le template dans le system prompt si présent (section `## Team POM Template`) avant les instructions de génération
- [x] T054 [US7] Créer `apps/frontend/src/pages/PomTemplatesPage.tsx` — liste des templates par framework/langage, formulaire textarea d'édition, bouton supprimer — route `/settings/pom-templates`
- [x] T055 [US7] Ajouter route `/settings/pom-templates` dans `apps/frontend/src/App.tsx` et lien "Templates POM" dans la nav settings de `AppLayout`

**Checkpoint** : Template configuré → génération → code incorpore le template comme base.

---

## Phase 10: US8 — Super Admin Backoffice (Priority: P3)

**Goal**: Alexandre peut accéder à `/super-admin`, voir tous les comptes clients, et suspendre/réactiver des équipes.

**Independent Test**: Accès `/super-admin` avec user super_admin → voir liste équipes → suspendre une équipe → vérifier que les membres n'ont plus accès → réactiver → accès rétabli.

### Implémentation US8

- [x] T056 [US8] Implémenter `apps/backend/src/routes/admin.ts` complet (tous avec middleware `requireSuperAdmin`) : `GET /teams` (liste paginée avec stats), `GET /teams/:id` (détail membres + générations récentes + usage LLM), `POST /teams/:id/suspend`, `POST /teams/:id/reactivate`, `GET /stats` (métriques globales)
- [x] T057 [US8] Créer `apps/frontend/src/pages/SuperAdminPage.tsx` — tableau de bord : tableau des équipes (plan, statut, membres, usage), vue détail, boutons suspend/réactiver avec confirmation
- [x] T058 [US8] Ajouter route `/super-admin` dans `apps/frontend/src/App.tsx` — protégée par vérification du rôle super_admin côté frontend (redirection si non autorisé)
- [x] T059 [US8] Créer `apps/backend/scripts/seed-super-admin.ts` — script pour insérer le premier `super_admin` en DB à partir de `process.env.SUPER_ADMIN_SEED_USER_ID`

**Checkpoint** : Dashboard super_admin fonctionnel, suspension effective, 403 pour les non super_admin.

---

## Phase 11: Polish & Cross-Cutting

**Purpose**: Qualité, sécurité, documentation — impacte l'ensemble des features V2

- [x] T060 [P] Audit TypeScript strict — corriger tous les `any` implicites dans les nouveaux fichiers (commande : `pnpm --filter backend typecheck`)
- [x] T061 [P] Couverture Vitest > 80% sur la logique métier V2 — écrire les tests manquants pour `GitPushService`, `WritebackService`, `XrayConnector`, `MistralAdapter`, `OllamaAdapter`, `GenerationService.getPomTemplate()` dans `apps/backend/src/`
- [x] T062 Audit sécurité isolation — vérifier que toutes les nouvelles routes filtrent par `teamId` du JWT (aucune fuite de données cross-team)
- [x] T063 [P] Mettre à jour `DEMO-SCRIPT.md` — ajouter les parcours V2 : Push Git (Sarah), Writeback (Marc), Xray (Sarah)
- [x] T064 Exécuter la validation de bout en bout du `quickstart.md` — tester chaque phase sur l'environnement de staging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** : Pas de dépendances — démarrer immédiatement
- **Phase 2 (Foundational)** : Dépend de Phase 1 — BLOQUE toutes les user stories
- **Phases 3–10 (User Stories)** : Toutes dépendent de Phase 2
  - Peuvent s'exécuter en parallèle si plusieurs développeurs disponibles
  - En solo : ordre priorité P1 → P2 → P3 (phases 3, 4, 5, 6, 7, 8, 9, 10)
- **Phase 11 (Polish)** : Dépend de la fin de toutes les user stories désirées

### User Story Dependencies

- **US1 Push Git (P1)** : Après Phase 2 — aucune dépendance sur les autres stories
- **US2 Writeback (P1)** : Après Phase 2 — aucune dépendance sur les autres stories
- **US3 Xray (P1)** : Après Phase 2 — aucune dépendance sur les autres stories
- **US4 ADO Test Plans (P1)** : Après Phase 2 — peut réutiliser méthodes ADO de US2 si développées
- **US5 Nouveaux frameworks (P2)** : Après Phase 2 — complètement indépendante
- **US6 Mistral + Ollama (P2)** : Après Phase 2 (migration `ollama_endpoint` requise)
- **US7 Templates POM (P2)** : Après Phase 2 — indépendante
- **US8 Super Admin (P3)** : Après Phase 2 (tables `super_admins` + `suspended_at` requises)

### Within Each User Story

- Backend avant frontend
- Services avant routes
- Routes avant composants UI

---

## Parallel Opportunities

### Setup (Phase 1)
```
Simultané : T001 + T002 (packages indépendants)
```

### Foundational (Phase 2)
```
Simultané : T004 à T013 (migrations indépendantes)
Puis séquentiel : T003 → T014 → T015 → T016 → T017 → T018
```

### US1 Push Git (Phase 3)
```
Simultané : T019 (GitHub) + T020 (GitLab) + T021 (Azure Repos)
Puis séquentiel : T022 (GitPushService) → T023 (routes) → T024-T025 → T026-T027-T028
```

### US5 Nouveaux frameworks (Phase 7)
```
Simultané : T040 + T041 + T042 + T043 + T044 + T045 (6 fichiers de prompts indépendants)
Puis : T046 (registry) → T047 (frontend)
```

### US6 Mistral + Ollama (Phase 8)
```
Simultané : T048 (MistralAdapter) + T049 (OllamaAdapter)
Puis : T050 (factory) → T051 (frontend)
```

---

## Implementation Strategy

### MVP V2 (US1 uniquement — Push Git)

1. Compléter Phase 1 (Setup)
2. Compléter Phase 2 (Foundational)
3. Compléter Phase 3 (US1 Push Git)
4. **STOP et VALIDER** : test push GitHub/GitLab/Azure Repos
5. Déployer / démontrer

### Livraison incrémentale (priorité P1 d'abord)

1. Setup + Foundational → Socle V2 prêt
2. US1 Push Git → Ferme la boucle génération → repo ✅
3. US2 Writeback → Ferme la boucle analyse → source ✅
4. US3 Xray → Traçabilité requirement ↔ test ✅
5. US4 ADO Test Plans → Parité ADO ✅
6. US5–US7 → Élargissement TAM et rétention
7. US8 Super Admin → Opérations internes

### Stratégie parallèle (2 développeurs)

Phase 2 terminée, puis :
- **Dev A** : US1 (Push Git) + US5 (Frameworks)
- **Dev B** : US2 (Writeback) + US3 (Xray) + US4 (ADO Test Plans)

---

## Résumé

| Phase | User Story | Tâches | Parallélisables |
|---|---|---|---|
| Phase 1 | Setup | 2 | 2 |
| Phase 2 | Foundational | 16 | 12 |
| Phase 3 | US1 — Push Git | 10 | 4 |
| Phase 4 | US2 — Writeback | 5 | 2 |
| Phase 5 | US3 — Xray | 3 | 0 |
| Phase 6 | US4 — ADO Test Plans | 3 | 0 |
| Phase 7 | US5 — Frameworks | 8 | 6 |
| Phase 8 | US6 — Mistral/Ollama | 4 | 2 |
| Phase 9 | US7 — Templates POM | 4 | 0 |
| Phase 10 | US8 — Super Admin | 4 | 0 |
| Phase 11 | Polish | 5 | 3 |
| **Total** | | **64** | **31** |

> 📊 **Progression** : 65 / 65 tâches complétées (T035b ajouté post-analyse)
> 🎯 **MVP V2** : Phases 1-3 (28 tâches, ~16h) — Push Git opérationnel
> 🗓️ **Objectif V2 complet** : Q3 2026 (~52h total)
