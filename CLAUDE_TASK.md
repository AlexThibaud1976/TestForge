# CLAUDE_TASK — 002-manual-test-first

> Ce fichier pilote l'implémentation de la feature "Manual Test First" via Claude Code.
> Usage : `claude < CLAUDE_TASK.md` ou ouvrir dans Claude Code et exécuter phase par phase.

---

## Contexte projet

TestForge est un SaaS B2B qui transforme des user stories Jira/Azure DevOps en tests automatisés Playwright/Selenium de qualité professionnelle. Le repo est un monorepo pnpm avec :

- `apps/backend/` — Node.js 20 + Express + TypeScript strict + Drizzle ORM
- `apps/frontend/` — React 18 + Vite + TypeScript strict + shadcn/ui + Tailwind
- `packages/shared-types/` — Types TypeScript partagés

La base de données est PostgreSQL via Supabase. L'auth est gérée par Supabase Auth (JWT). Tous les appels LLM passent par l'interface `LLMClient` (factory dans `apps/backend/src/services/llm/index.ts`).

## Feature à implémenter

Ajouter une étape intermédiaire au pipeline : **générer des tests manuels structurés** depuis les critères d'acceptance, les faire valider, les pousser vers Xray/ADO, puis injecter leurs IDs dans le code des tests automatisés.

**Spec complète** : `specs/002-manual-test-first/spec.md`
**Plan technique** : `specs/002-manual-test-first/plan.md`
**Modèle de données** : `specs/002-manual-test-first/data-model.md`
**Tâches détaillées** : `specs/002-manual-test-first/tasks.md`

## Règles de code

1. **TypeScript strict** — `"strict": true`, aucun `any` implicite, aucun `@ts-ignore`
2. **LLM** — tout appel LLM passe par `createLLMClient()` depuis `services/llm/index.ts` — jamais d'appel direct SDK
3. **Multi-tenant** — toute requête DB est scopée par `team_id`. Pas de fuite de données inter-équipe
4. **Validation** — Zod sur tous les body de route
5. **Credentials** — jamais en clair, toujours `encrypt()`/`decrypt()` via `utils/encryption.ts`
6. **Tests** — Vitest pour les tests unitaires, > 80% coverage sur la logique métier
7. **Conventional Commits** — `feat:`, `fix:`, `test:`, `chore:`
8. **Pas de logs métier** — ne jamais logger le contenu des US, tests ou code généré

## Commandes utiles

```bash
pnpm --filter backend dev          # backend dev server (port 3099)
pnpm --filter frontend dev         # frontend dev server (port 5173)
pnpm --filter backend test         # run Vitest
pnpm --filter backend test:watch   # watch mode
pnpm --filter backend typecheck    # strict TS check
pnpm --filter backend lint         # ESLint
pnpm --filter backend db:generate  # générer migration Drizzle
pnpm --filter backend db:migrate   # appliquer migration
```

---

## PHASE 1 — Schema + ManualTestService + Prompt

### Objectif
Créer les tables DB, les types partagés, le prompt LLM, et le service de génération de tests manuels.

### Tâche 1.1 — Schema Drizzle + migration

Ouvrir `apps/backend/src/db/schema.ts` et ajouter les deux tables suivantes après les tables existantes. Le schéma exact est dans `specs/002-manual-test-first/data-model.md`.

Tables à créer :
- `manual_test_sets` — lot de tests manuels lié à une analyse
- `manual_test_cases` — cas de test individuel avec steps en JSONB

Colonne à ajouter :
- `generations.manual_test_set_id` — uuid nullable, FK vers manual_test_sets

Puis générer et appliquer la migration :
```bash
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
```

Vérifier que les relations Drizzle sont bien déclarées (pour `db.query.manualTestSets.findFirst()` etc).

### Tâche 1.2 — Types partagés

Ouvrir `packages/shared-types/src/index.ts` et ajouter :

```typescript
// ─── Manual Tests ─────────────────────────────────────────────────────────────

export type ManualTestPriority = 'critical' | 'high' | 'medium' | 'low';
export type ManualTestCategory = 'happy_path' | 'error_case' | 'edge_case' | 'other';
export type ManualTestSetStatus = 'draft' | 'validated' | 'pushed';

export interface ManualTestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
}

export interface ManualTestCase {
  id: string;
  title: string;
  precondition: string | null;
  priority: ManualTestPriority;
  category: ManualTestCategory;
  steps: ManualTestStep[];
  sortOrder: number;
  externalId: string | null;
  externalUrl: string | null;
  externalSource: 'xray' | 'ado' | null;
}

export interface ExcludedCriterion {
  criterion: string;
  reason: string;
}

export interface ManualTestSet {
  id: string;
  analysisId: string;
  teamId: string;
  userStoryId: string;
  status: ManualTestSetStatus;
  usedImprovedVersion: boolean;
  version: number;
  testCases: ManualTestCase[];
  excludedCriteria: ExcludedCriterion[];
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  validatedAt: string | null;
  validatedBy: string | null;
  pushedAt: string | null;
  pushTarget: 'xray' | 'ado' | null;
  createdAt: string;
}
```

### Tâche 1.3 — Prompt LLM

Créer `apps/backend/src/services/manual-tests/prompts/manual-test-v1.0.ts`.

Le format du prompt et de la réponse attendue est détaillé dans `specs/002-manual-test-first/plan.md` section "Prompt de génération des tests manuels".

Points clés du prompt :
- Le LLM reçoit : titre US, description, critères d'acceptance, suggestions de l'analyse
- Il retourne un JSON avec `testCases[]` et `excludedCriteria[]`
- Chaque test case a : title, precondition, priority, category, steps[{action, expectedResult}]
- Les AC techniques (performance, sécurité) doivent être dans excludedCriteria
- Le prompt demande la couverture happy path + au moins 2 cas d'erreur
- Réponse en JSON uniquement, pas de markdown

Exporter : `MANUAL_TEST_PROMPT_VERSION`, `MANUAL_TEST_SYSTEM_PROMPT`, `buildManualTestUserPrompt(title, description, acceptanceCriteria, analysisSuggestions)`.

### Tâche 1.4 — ManualTestService

Créer `apps/backend/src/services/manual-tests/ManualTestService.ts`.

S'inspirer du pattern de `AnalysisService.ts` et `GenerationService.ts` pour la structure.

Méthodes à implémenter :

```typescript
class ManualTestService {
  // Génère un lot de tests manuels depuis une analyse
  async generate(analysisId: string, teamId: string, useImprovedVersion: boolean): Promise<ManualTestSetResult>
  
  // Retourne le dernier ManualTestSet actif pour une analyse
  async getByAnalysis(analysisId: string, teamId: string): Promise<ManualTestSetResult | null>
  
  // Met à jour les test cases (édition inline)
  async update(setId: string, teamId: string, testCases: UpdateTestCaseInput[]): Promise<ManualTestSetResult>
  
  // Valide le lot
  async validate(setId: string, teamId: string, userId: string): Promise<ManualTestSetResult>
  
  // Régénère (incrémente version)
  async regenerate(analysisId: string, teamId: string, useImprovedVersion: boolean): Promise<ManualTestSetResult>
}
```

Le parsing de la réponse LLM doit être robuste : même pattern que `AnalysisService.parseResponse()` — try/catch JSON.parse, fallback regex extraction du JSON, clamp des valeurs.

Vérifications à faire :
- Si l'US n'a pas d'AC → throw Error avec message explicite
- Si le score d'analyse < 40 → générer quand même mais ajouter un warning dans la réponse

### Tâche 1.5 — Tests unitaires ManualTestService

Créer `apps/backend/src/services/manual-tests/ManualTestService.test.ts`.

Mocker : `db`, `createLLMClient`, `decrypt`. Même pattern que `AnalysisService.test.ts`.

Tests à écrire :
- `generate()` avec LLM mocké → vérifier structure du ManualTestSet persisté (N test cases, steps, priorities)
- `generate()` avec AC vides → vérifier le throw
- `update()` → vérifier que les test cases sont remplacés en DB
- `validate()` → vérifier status = 'validated', validatedAt non null, validatedBy = userId
- `regenerate()` → vérifier que version est incrémenté

Exécuter : `pnpm --filter backend test` → tous les tests doivent passer.

---

## PHASE 2 — Routes API

### Objectif
Exposer les endpoints REST. Voir `specs/002-manual-test-first/plan.md` section "API Endpoints" pour les contrats.

### Tâche 2.1 — Route manual-tests.ts

Créer `apps/backend/src/routes/manual-tests.ts` avec :

- `POST /api/analyses/:id/manual-tests` — requireAuth, body `{ useImprovedVersion: boolean }`, appelle `ManualTestService.generate()`, retourne 201
- `GET /api/analyses/:id/manual-tests` — requireAuth, appelle `getByAnalysis()`, retourne 200 (ou 404 si aucun set)
- `PUT /api/manual-test-sets/:id` — requireAuth, body `{ testCases: [...] }`, appelle `update()`, retourne 200
- `POST /api/manual-test-sets/:id/validate` — requireAuth, appelle `validate()`, retourne 200

Validation Zod sur chaque endpoint. Isolation par teamId sur chaque requête.

### Tâche 2.2 — Enregistrement dans index.ts

Ouvrir `apps/backend/src/index.ts` et ajouter dans la section `v2Routes` :

```typescript
{ path: './routes/manual-tests.js', name: '/api' },
```

Note : les routes utilisent des préfixes mixtes (`/api/analyses/:id/manual-tests` et `/api/manual-test-sets/:id`), donc monter sur `/api`.

### Tâche 2.3 — Tests d'intégration

Ajouter des tests Supertest si le pattern existe déjà dans le projet, sinon des tests unitaires de la route avec les mocks appropriés.

Vérifier : `pnpm --filter backend test && pnpm --filter backend typecheck`

---

## PHASE 3 — Push Xray / ADO

### Objectif
Pousser les tests manuels vers Xray Cloud ou ADO Test Plans. Réutiliser les connectors existants.

### Tâche 3.1 — Méthodes push dans ManualTestService

Ajouter dans `ManualTestService.ts` :

```typescript
async pushToXray(setId: string, teamId: string): Promise<PushResult>
async pushToADO(setId: string, teamId: string): Promise<PushResult>
```

Pour Xray : réutiliser `XrayConnector.createTest()` existant (`apps/backend/src/services/xray/XrayConnector.ts`). Pour chaque `manual_test_case`, créer un Test Xray avec les steps et stocker `externalId` + `externalUrl`.

Pour ADO : réutiliser `ADOConnector.createTestCase()` existant (`apps/backend/src/services/connectors/ADOConnector.ts`).

Gérer l'idempotence : si `externalId` est déjà renseigné, on met à jour au lieu de créer.

### Tâche 3.2 — Méthodes de mise à jour dans les connectors

Ajouter dans `XrayConnector.ts` :
- `updateTestSteps(testKey: string, steps: XrayStep[]): Promise<void>` — PUT les steps d'un test existant
- `getTestSteps(testKey: string): Promise<XrayStep[]>` — GET les steps (pour la resync Phase 6)

Ajouter dans `ADOConnector.ts` :
- `updateTestCaseSteps(testCaseId: number, steps: {action, expectedResult}[]): Promise<void>`

### Tâche 3.3 — Route push

Ajouter dans `manual-tests.ts` :

- `POST /api/manual-test-sets/:id/push` — requireAuth, requirePro (plan Pro requis), body `{ target: 'xray' | 'ado' }`, retourne `{ pushed: N, testCases: [{id, externalId, externalUrl}] }`

### Tâche 3.4 — Tests

Tests unitaires push avec XrayConnector et ADOConnector mockés.

---

## PHASE 4 — Frontend

### Objectif
Nouvel onglet "Tests manuels" dans StoryDetailPage avec liste éditable, validation, push.

### Tâche 4.1 — Composants

Créer dans `apps/frontend/src/components/` :

1. **ManualTestList.tsx** — liste des cas de test. Chaque item montre : titre, badge priorité, badge catégorie, nombre de steps, badge externalId si pushé. Expandable pour voir les steps.

2. **ManualTestEditor.tsx** — édition inline. Modifier titre, précondition, priorité. Ajouter/supprimer/réordonner steps. Ajouter/supprimer test case. Bouton "Sauvegarder" → PUT API.

3. **ManualTestValidateButton.tsx** — dialog de confirmation + appel POST validate.

4. **ManualTestPushButton.tsx** — sélecteur Xray/ADO + appel POST push. Grisé si plan Starter.

5. **ManualTestGenerateButton.tsx** — choix US originale ou améliorée + appel POST generate. Dialog de confirmation si régénération.

Utiliser shadcn/ui et Tailwind pour le styling. Voir les composants existants (XrayTestButton, WritebackButton) pour le pattern.

### Tâche 4.2 — Intégration StoryDetailPage

Modifier `apps/frontend/src/pages/StoryDetailPage.tsx` :
- Ajouter un onglet "Tests manuels" entre "Analyse" et "Génération"
- Contenu conditionnel : si aucun set → bouton Générer ; sinon → liste + éditeur + actions

### Tâche 4.3 — Lien dans l'onglet Génération

Ajouter dans l'onglet "Génération" :
- Si tests manuels validés → checkbox "Lier aux tests manuels validés" (coché par défaut)
- Si coché → envoyer `manualTestSetId` dans le POST /api/generations

---

## PHASE 5 — Injection dans GenerationService

### Objectif
Le code automatisé généré contient les annotations @testCaseId.

### Tâche 5.1 — Modifier GenerationService

Ouvrir `apps/backend/src/services/generation/GenerationService.ts`.

Dans `processGeneration()`, si `manualTestSetId` est fourni :
1. Charger les manual_test_cases depuis la DB
2. Construire une section additionnelle dans le prompt (voir le format dans `plan.md`)
3. Injecter après le system prompt principal (même pattern que l'injection du POM template)

### Tâche 5.2 — Modifier la route generations

Ouvrir `apps/backend/src/routes/generations.ts`.

Ajouter `manualTestSetId: z.string().uuid().optional()` dans le schéma Zod du POST.
Passer `manualTestSetId` à `createPending()` et `processGeneration()`.

### Tâche 5.3 — Tests

Vérifier que :
- Avec manualTestSetId → le prompt contient la section "Linked Manual Test Cases"
- Sans manualTestSetId → comportement identique à V1 (pas de régression)

---

## PHASE 6 — Resync (P2, post-démo)

Voir `specs/002-manual-test-first/tasks.md` Phase 6 pour le détail. Cette phase peut être implémentée après la démo Itecor.

---

## Vérification finale

Après chaque phase, exécuter :

```bash
pnpm --filter backend typecheck    # aucune erreur TS
pnpm --filter backend lint         # aucune erreur lint  
pnpm --filter backend test         # tous les tests passent
pnpm --filter frontend typecheck   # aucune erreur TS frontend
```

Avant le commit final :

```bash
pnpm test && pnpm typecheck && pnpm lint
git add .
git commit -m "feat: 002-manual-test-first — generate, validate, push manual tests with traceability"
```
