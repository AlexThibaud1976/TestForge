# Tasks — Manual Test First

**Branch**: `002-manual-test-first` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Infrastructure & ManualTestService (Priority: P1)

**Goal**: Créer le schéma DB, le service de génération de tests manuels, et le prompt LLM. À la fin de cette phase, on peut générer des tests manuels via un appel API.

**Independent Test**: `POST /api/analyses/:id/manual-tests` retourne un JSON avec des cas de test structurés depuis une analyse existante.

### Schema & Types

- [ ] T001 [P] Ajouter les tables `manual_test_sets` et `manual_test_cases` dans `apps/backend/src/db/schema.ts` — schéma Drizzle conforme à `data-model.md`
- [ ] T002 [P] Ajouter la colonne `manual_test_set_id` (uuid nullable, FK) sur la table `generations` dans le schéma Drizzle
- [ ] T003 [P] Générer et appliquer la migration Drizzle (`pnpm --filter backend db:generate && db:migrate`)
- [ ] T004 [P] Ajouter les types `ManualTestSet`, `ManualTestCase`, `ManualTestStep`, `ManualTestPriority`, `ManualTestCategory` dans `packages/shared-types/src/index.ts`

### Prompt LLM

- [ ] T005 [P] Créer `apps/backend/src/services/manual-tests/prompts/manual-test-v1.0.ts` — exporter `MANUAL_TEST_PROMPT_VERSION`, `MANUAL_TEST_SYSTEM_PROMPT`, `buildManualTestUserPrompt(title, description, ac, analysisSuggestions)`
- [ ] T006 Tester le prompt sur 5 US variées (connexion, formulaire CRUD, navigation, modale, workflow multi-étapes) — vérifier que le JSON retourné est valide et les steps sont pertinents
- [ ] T007 Itérer le prompt : vérifier que les AC techniques (performance, sécurité) sont bien identifiés dans `excludedCriteria`

### ManualTestService

- [ ] T008 [P] Créer `apps/backend/src/services/manual-tests/ManualTestService.ts` avec les méthodes :
  - `generate(analysisId, teamId, useImprovedVersion)` — appel LLM, parse JSON, persist en DB
  - `getByAnalysis(analysisId, teamId)` — retourne le dernier ManualTestSet actif
  - `update(setId, teamId, testCases[])` — remplace les test cases (édition inline)
  - `validate(setId, teamId, userId)` — passe le statut en "validated"
  - `regenerate(analysisId, teamId, useImprovedVersion)` — incrémente `version`, génère un nouveau lot
- [ ] T009 [P] Implémenter le parsing robuste de la réponse LLM dans `ManualTestService` — même pattern que `AnalysisService.parseResponse()` avec fallback JSON extraction
- [ ] T010 Créer `apps/backend/src/services/manual-tests/ManualTestService.test.ts` — tests unitaires :
  - Test génération avec LLM mocké → vérifier la structure du ManualTestSet persisté
  - Test update → vérifier que les test cases sont remplacés
  - Test validate → vérifier le statut + validatedAt + validatedBy
  - Test regenerate → vérifier que la version est incrémentée
  - Test avec AC vides → vérifier le message d'erreur

**Checkpoint** : `ManualTestService.generate()` fonctionne en isolation avec un LLM mocké.

---

## Phase 2: Routes API (Priority: P1)

**Goal**: Exposer les endpoints REST pour la génération, l'édition, la validation des tests manuels.

**Independent Test**: Appeler `POST /api/analyses/:id/manual-tests` via Supertest → vérifier 201 + structure JSON.

### Routes

- [ ] T011 [P] Créer `apps/backend/src/routes/manual-tests.ts` avec les endpoints :
  - `POST /api/analyses/:id/manual-tests` — génère les tests manuels (requireAuth, plans Starter+Pro)
  - `GET /api/analyses/:id/manual-tests` — récupère le ManualTestSet courant
  - `PUT /api/manual-test-sets/:id` — met à jour les test cases (requireAuth)
  - `POST /api/manual-test-sets/:id/validate` — valide le lot (requireAuth)
- [ ] T012 Ajouter les schémas de validation Zod pour chaque endpoint (body + params)
- [ ] T013 Enregistrer le routeur dans `apps/backend/src/index.ts` — section V2 routes (chargement dynamique)
- [ ] T014 Écrire les tests d'intégration des routes (Supertest) :
  - POST génération → 201 avec testCases
  - GET récupération → 200 avec le bon set
  - PUT update → 200 avec les test cases modifiés
  - POST validate → 200 avec status "validated"
  - POST sur analyse inexistante → 404
  - POST sans auth → 401

**Checkpoint** : CRUD complet des tests manuels fonctionnel via API.

---

## Phase 3: Push vers Xray / ADO (Priority: P1)

**Goal**: Pousser les tests manuels validés vers Xray Cloud ou ADO Test Plans, stocker les IDs externes.

**Independent Test**: Générer + valider des tests manuels → `POST /api/manual-test-sets/:id/push` → vérifier les IDs Xray retournés.

### Push Service

- [ ] T015 [P] Ajouter méthode `pushToXray(setId, teamId)` dans `ManualTestService` :
  - Charger la config Xray de l'équipe (`xray_configs`)
  - Pour chaque `manual_test_case` : appeler `XrayConnector.createTest()` avec les steps
  - Stocker `externalId` + `externalUrl` sur chaque test case
  - Mettre à jour `manual_test_sets.status = 'pushed'`, `pushed_at`, `push_target = 'xray'`
- [ ] T016 [P] Ajouter méthode `pushToADO(setId, teamId)` dans `ManualTestService` :
  - Charger la connexion ADO de l'équipe
  - Pour chaque test case : appeler `ADOConnector.createTestCase()` avec les steps
  - Stocker `externalId` + `externalUrl`
- [ ] T017 [P] Gérer l'idempotence : si `externalId` est déjà renseigné, mettre à jour le test existant au lieu de créer un doublon
  - Xray : utiliser `PUT /test/{testKey}/step` pour mettre à jour les steps
  - ADO : utiliser `PATCH /wit/workitems/{id}` pour mettre à jour les steps
- [ ] T018 Ajouter méthodes dans `XrayConnector` : `getTestSteps(testKey)` et `updateTestSteps(testKey, steps[])`
- [ ] T019 Ajouter méthode dans `ADOConnector` : `updateTestCaseSteps(testCaseId, steps[])`

### Route push

- [ ] T020 Ajouter endpoint `POST /api/manual-test-sets/:id/push` dans `manual-tests.ts` :
  - Body : `{ target: 'xray' | 'ado' }`
  - Validation : plan Pro requis, set doit exister, config Xray/ADO doit exister
  - Retourne : `{ pushed: N, testCases: [{ id, externalId, externalUrl }] }`
- [ ] T021 Tests unitaires push (XrayConnector + ADOConnector mockés) :
  - Push Xray → IDs stockés
  - Push ADO → IDs stockés
  - Re-push → update au lieu de doublon
  - Push sans config Xray → erreur 400

**Checkpoint** : Tests manuels poussés vers Xray/ADO avec IDs visibles dans l'API.

---

## Phase 4: Frontend — Liste, Édition, Validation (Priority: P1)

**Goal**: Nouvel onglet "Tests manuels" sur StoryDetailPage avec liste éditable, validation, et push.

**Independent Test**: Ouvrir une US → onglet "Tests manuels" → générer → éditer un step → valider → pousser vers Xray.

### Composants

- [ ] T022 [P] Créer `apps/frontend/src/components/ManualTestList.tsx` — affiche la liste des cas de test avec :
  - Pour chaque test case : titre, priorité (badge coloré), catégorie, nombre de steps
  - Expandable : cliquer pour voir les steps détaillés
  - Badge externalId si pushé (lien cliquable vers Xray/ADO)
  - État global du set : draft / validated / pushed
- [ ] T023 [P] Créer `apps/frontend/src/components/ManualTestEditor.tsx` — édition inline :
  - Éditer le titre, la précondition, la priorité d'un test case
  - Ajouter / supprimer / réordonner les steps (drag & drop ou boutons ↑↓)
  - Ajouter / supprimer un test case entier
  - Bouton "Sauvegarder" → `PUT /api/manual-test-sets/:id`
- [ ] T024 Créer `apps/frontend/src/components/ManualTestValidateButton.tsx` — bouton "Valider les tests" :
  - Disabled si aucun test case
  - Dialog de confirmation avec résumé (N tests, M steps au total)
  - Après validation : badge "Validé par [nom] le [date]"
- [ ] T025 Créer `apps/frontend/src/components/ManualTestPushButton.tsx` — bouton "Pousser vers Xray/ADO" :
  - Sélecteur cible (Xray ou ADO selon les configs de l'équipe)
  - Loading state pendant le push
  - Après push : affichage des IDs externes avec liens
  - Grisé si plan Starter (tooltip "Disponible sur le plan Pro")
- [ ] T026 Créer `apps/frontend/src/components/ManualTestGenerateButton.tsx` — bouton "Générer tests manuels" :
  - Choix "US originale" ou "Version améliorée" (si disponible)
  - Loading state pendant la génération LLM
  - Si tests manuels existent déjà : dialog "Régénérer ? Les tests actuels seront archivés"

### Intégration StoryDetailPage

- [ ] T027 [P] Ajouter un onglet "Tests manuels" dans `apps/frontend/src/pages/StoryDetailPage.tsx` :
  - Position : entre l'onglet "Analyse" et "Génération"
  - Contenu : `ManualTestGenerateButton` si aucun set, sinon `ManualTestList` + `ManualTestEditor`
  - Barre d'actions : `ManualTestValidateButton` + `ManualTestPushButton`
- [ ] T028 Ajouter un indicateur visuel sur l'onglet "Génération" :
  - Si des tests manuels validés existent → badge "Tests manuels validés ✓" avec suggestion d'utiliser le lien
  - Si des tests manuels existent mais ne sont pas validés → badge "Tests manuels en cours"

**Checkpoint** : Flow complet dans l'UI — générer, éditer, valider, pousser les tests manuels.

---

## Phase 5: Injection dans GenerationService (Priority: P1)

**Goal**: Les tests automatisés générés contiennent les annotations @testCaseId et les commentaires step-by-step.

**Independent Test**: Valider des tests manuels avec IDs → générer tests auto avec `manualTestSetId` → vérifier que le code contient les tags et commentaires.

### Modification GenerationService

- [ ] T029 [P] Modifier `apps/backend/src/routes/generations.ts` — ajouter le champ optionnel `manualTestSetId` (uuid) dans le schéma Zod de `POST /api/generations`
- [ ] T030 [P] Modifier `GenerationService.processGeneration()` :
  - Si `manualTestSetId` est fourni, charger les `manual_test_cases` associés
  - Construire une section `## Linked Manual Test Cases` dans le prompt
  - Pour chaque test case : inclure le titre, l'externalId (si disponible), et les steps
  - Ajouter les instructions d'annotation dans le prompt (tag Playwright + commentaires)
- [ ] T031 [P] Modifier `GenerationService.createPending()` — persister `manual_test_set_id` dans le record `generations`
- [ ] T032 Mettre à jour le prompt `generation-v1.0.ts` (ou créer `generation-v1.1.ts`) — ajouter la section de template pour les annotations test case :
  ```
  ## Annotations test case (si des tests manuels sont fournis)
  
  - Chaque test.describe DOIT inclure le tag du test manuel : { tag: ['@XRAY-123'] }
  - Chaque step du test manuel DOIT apparaître en commentaire dans le test auto :
    // Step 1 (XRAY-123): Navigate to /login
  - Le mapping step → code DOIT être visible pour la traçabilité
  ```
- [ ] T033 Tests unitaires :
  - Génération avec manualTestSetId → vérifier que le prompt contient les tests manuels
  - Génération sans manualTestSetId → comportement V1 inchangé (pas de régression)
  - Génération avec tests manuels SANS externalId → pas de tag, mais commentaires steps présents

### Frontend — lien dans l'onglet Génération

- [ ] T034 Modifier l'onglet "Génération" dans `StoryDetailPage.tsx` :
  - Si des tests manuels validés existent, ajouter un checkbox "Lier aux tests manuels validés" (coché par défaut)
  - Si coché → envoyer `manualTestSetId` dans le `POST /api/generations`
  - Après génération : afficher les annotations trouvées dans le code (ex: "3 tests liés : XRAY-123, XRAY-124, XRAY-125")

**Checkpoint** : Le code auto généré contient les tags @testCaseId et les commentaires step-by-step.

---

## Phase 6: Resync depuis Xray / ADO (Priority: P2)

**Goal**: Relire les tests manuels depuis Xray/ADO après édition externe, pour maintenir la cohérence.

**Independent Test**: Pousser des tests vers Xray → modifier un step dans Xray → cliquer "Resync" → vérifier le diff dans TestForge.

### Connectors — méthodes de lecture

- [ ] T035 Ajouter `getTestSteps(testKey)` dans `XrayConnector` — `GET /test/{testKey}/step` via API Xray Cloud v2
- [ ] T036 Ajouter `getTestCaseSteps(testCaseId)` dans `ADOConnector` — `GET /testcases/{id}` via TestApi ADO
- [ ] T037 Tests unitaires pour les deux méthodes de lecture (mock HTTP)

### Resync service

- [ ] T038 Ajouter méthode `resync(setId, teamId)` dans `ManualTestService` :
  - Charger les `manual_test_cases` avec `externalId` non null
  - Pour chaque test : relire les steps depuis la source (Xray ou ADO)
  - Comparer avec les steps locaux
  - Retourner un diff `{ testCaseId, stepsAdded, stepsModified, stepsRemoved }`
  - Sur confirmation de l'utilisateur : mettre à jour les steps locaux
- [ ] T039 Gérer le cas "test supprimé dans la source" → marquer le test case comme `externalSource = null` + warning

### Route resync

- [ ] T040 Ajouter endpoint `POST /api/manual-test-sets/:id/resync` dans `manual-tests.ts` :
  - Plan Pro requis
  - Retourne le diff sans appliquer
  - Body optionnel `{ apply: true }` pour appliquer les changements
- [ ] T041 Tests unitaires resync (connectors mockés)

### Frontend

- [ ] T042 Ajouter un bouton "Resync depuis Xray/ADO" dans `ManualTestPushButton.tsx` (visible si tests déjà pushés)
- [ ] T043 Dialog de diff : afficher les steps modifiés/ajoutés/supprimés avec bouton "Appliquer"

**Checkpoint** : Resync fonctionnel avec affichage du diff et application sur confirmation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Infrastructure): Aucune dépendance — peut démarrer immédiatement
- **Phase 2** (Routes API): Dépend de Phase 1
- **Phase 3** (Push Xray/ADO): Dépend de Phase 2, réutilise XrayConnector + ADOConnector existants
- **Phase 4** (Frontend): Dépend de Phase 2 (API nécessaire), peut démarrer en parallèle avec Phase 3
- **Phase 5** (Injection GenerationService): Dépend de Phase 2, indépendant de Phase 3/4
- **Phase 6** (Resync — P2): Dépend de Phase 3 (push doit fonctionner d'abord)

### Chemin critique pour la démo Itecor

Phases 1 → 2 → 4 + 5 en parallèle → démo. Phase 3 et 6 peuvent être finalisées après si nécessaire, mais Phase 3 (push) est un must-have pour la démo.

### Matrice de risques

| Risque | Impact | Mitigation |
|---|---|---|
| Prompt manual-test produit des steps trop vagues | Élevé | Itérer sur 5+ US variées (T006), inclure des exemples few-shot |
| API Xray update steps non documentée | Moyen | Fallback : supprimer + recréer le test (perte d'historique Xray) |
| Temps de génération LLM > 15s | Faible | Les tests manuels sont un JSON plus petit que le code POM — devrait être rapide |
| Conflit avec features V2 en cours | Faible | Tables nouvelles, pas de modification de tables existantes (sauf 1 colonne nullable) |
