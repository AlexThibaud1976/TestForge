# Implementation Plan: Manual Test First

**Branch**: `002-manual-test-first` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

Ajouter au pipeline TestForge une étape de génération de tests manuels entre l'analyse et la génération automatisée. Les tests manuels sont générés par LLM depuis les AC, éditables/validables dans l'UI, pushables vers Xray Cloud ou ADO Test Plans, et leurs IDs sont injectés dans le code des tests automatisés pour traçabilité complète.

Cette feature s'appuie sur l'infrastructure V2 existante (XrayConnector, ADOConnector.createTestCase, schéma xray_tests/ado_test_cases) et la réorganise autour d'un concept central : `ManualTestSet` — un lot de cas de test manuels liés à une analyse.

---

## Technical Context

**Language/Version**: TypeScript strict 5.x (frontend + backend)
**Primary Dependencies**: React 18 + Vite, Node.js 20 + Express, Drizzle ORM, Supabase Auth (JWT), XrayConnector (existant), ADOConnector (existant)
**Storage**: PostgreSQL via Supabase — +2 nouvelles tables (`manual_test_sets`, `manual_test_cases`), +1 colonne sur `generations`
**Testing**: Vitest (unit + integration), objectif > 80% sur ManualTestService + prompt
**Target Platform**: Railway (backend) + Vercel (frontend) — inchangé
**Performance Goals**: Génération tests manuels < 15s, Push Xray/ADO < 20s (cohérent V1)
**Constraints**: Credentials chiffrés AES-256-GCM, données EU, pas de clé API dans les logs

---

## Constitution Check

| Principe | Statut | Notes |
|---|---|---|
| TypeScript strict — aucun `any` implicite | ✅ Pass | ManualTestService + prompt en strict |
| LLM : toujours via `LLMClient` interface | ✅ Pass | Génération tests manuels passe par LLMClient |
| Qualité du code généré (POM + fixtures) | ✅ Pass | Le code auto injecte les IDs manuels sans dégrader la structure |
| Sécurité : credentials chiffrés AES-256-GCM | ✅ Pass | Réutilise les connexions Xray/ADO existantes |
| RGPD / données EU | ✅ Pass | Aucune donnée hors EU |
| Performance : génération < 30s | ✅ Pass | Tests manuels < 15s, tests auto inchangé |
| Tests > 80% sur logique métier | ✅ Pass | Tests unitaires ManualTestService, prompt, push |

---

## Architecture

### Nouveau service : ManualTestService

```
[AnalysisResult]
       │
       ▼
[ManualTestService]
  │ buildManualTestPrompt(analysis, story, useImproved)
  │ LLMClient.complete(prompt) → JSON array de test cases
  │ parse + persist dans manual_test_sets / manual_test_cases
  │
  ▼
[ManualTestSet]  ←→  [UI: édition inline, validation]
       │
       ├─► [XrayConnector.createTest()]  → Xray Cloud  → stocke testKey
       ├─► [ADOConnector.createTestCase()]  → ADO  → stocke testCaseId
       │
       ▼
[GenerationService.processGeneration()]
  │ Reçoit manualTestSetId en paramètre
  │ Charge les tests manuels validés + leurs IDs
  │ Injecte dans le prompt de génération auto
  │
  ▼
[Code POM avec @testCaseId + commentaires step-by-step]
```

### Modification du GenerationService existant

Le `processGeneration()` reçoit un paramètre optionnel `manualTestSetId`. Si fourni :

1. Charge les `manual_test_cases` associés (avec `externalId` si disponible)
2. Construit une section additionnelle dans le prompt de génération :
   ```
   ## Linked Manual Test Cases
   
   The generated tests MUST reference these manual test IDs:
   
   Test Case 1: XRAY-123 - Login with valid credentials
     Step 1: Navigate to /login → Login page is displayed
     Step 2: Enter valid email and password → Fields are populated
     Step 3: Click Submit → User is redirected to dashboard
   
   In the test spec, use:
   - test.describe tag: ['@XRAY-123']
   - Comment each step: // Step 1 (XRAY-123): Navigate to /login
   ```
3. Le code généré inclut naturellement les annotations

### Prompt de génération des tests manuels

Nouveau fichier : `apps/backend/src/services/manual-tests/prompts/manual-test-v1.0.ts`

Le prompt demande au LLM de :
- Analyser les AC (originaux ou améliorés)
- Produire un JSON structuré avec N cas de test
- Chaque cas contient : `title`, `precondition`, `priority`, `steps[]` avec `{action, expectedResult}`
- Distinguer les AC testables manuellement des AC techniques
- Couvrir le happy path + edge cases identifiés dans l'analyse

Format de réponse attendu :
```json
{
  "testCases": [
    {
      "title": "Login with valid credentials",
      "precondition": "User has a registered account",
      "priority": "critical",
      "category": "happy_path",
      "steps": [
        { "action": "Navigate to /login", "expectedResult": "Login page is displayed with email and password fields" },
        { "action": "Enter valid email and password", "expectedResult": "Fields are populated, submit button is enabled" },
        { "action": "Click Submit", "expectedResult": "User is redirected to dashboard, welcome message displayed" }
      ]
    },
    {
      "title": "Login with invalid password",
      "precondition": "User has a registered account",
      "priority": "high",
      "category": "error_case",
      "steps": [
        { "action": "Navigate to /login", "expectedResult": "Login page is displayed" },
        { "action": "Enter valid email and wrong password", "expectedResult": "Fields are populated" },
        { "action": "Click Submit", "expectedResult": "Error message 'Invalid credentials' is displayed, user stays on login page" }
      ]
    }
  ],
  "excludedCriteria": [
    { "criterion": "Response time < 2s", "reason": "Performance criterion — not manually testable" }
  ]
}
```

---

## API Endpoints

### Nouveaux endpoints

| Méthode | Route | Description | Plan |
|---------|-------|-------------|------|
| POST | `/api/analyses/:id/manual-tests` | Générer les tests manuels depuis une analyse | Starter + Pro |
| GET | `/api/analyses/:id/manual-tests` | Récupérer le ManualTestSet d'une analyse | Starter + Pro |
| PUT | `/api/manual-test-sets/:id` | Mettre à jour les tests manuels (édition inline) | Starter + Pro |
| POST | `/api/manual-test-sets/:id/validate` | Valider le lot de tests manuels | Starter + Pro |
| POST | `/api/manual-test-sets/:id/push` | Pousser vers Xray ou ADO | Pro |
| POST | `/api/manual-test-sets/:id/resync` | Re-synchroniser depuis Xray/ADO | Pro |

### Endpoint modifié

| Méthode | Route | Changement |
|---------|-------|-----------|
| POST | `/api/generations` | Nouveau champ optionnel `manualTestSetId` dans le body |

### Contrats détaillés

**POST `/api/analyses/:id/manual-tests`**
```json
// Request
{ "useImprovedVersion": true }

// Response 201
{
  "id": "uuid",
  "analysisId": "uuid",
  "status": "draft",
  "testCases": [
    {
      "id": "uuid",
      "title": "Login with valid credentials",
      "precondition": "User has a registered account",
      "priority": "critical",
      "category": "happy_path",
      "steps": [
        { "stepNumber": 1, "action": "Navigate to /login", "expectedResult": "Login page displayed" }
      ],
      "externalId": null,
      "externalUrl": null
    }
  ],
  "excludedCriteria": [...],
  "createdAt": "2026-03-25T10:00:00Z"
}
```

**PUT `/api/manual-test-sets/:id`**
```json
// Request — envoi du lot complet (remplace tous les test cases)
{
  "testCases": [
    {
      "id": "uuid-existant-ou-null-pour-nouveau",
      "title": "...",
      "precondition": "...",
      "priority": "high",
      "steps": [...]
    }
  ]
}

// Response 200
{ "id": "uuid", "status": "draft", "testCases": [...], "updatedAt": "..." }
```

**POST `/api/manual-test-sets/:id/validate`**
```json
// Request (empty body — l'auteur est déduit du JWT)
{}

// Response 200
{ "id": "uuid", "status": "validated", "validatedAt": "...", "validatedBy": "userId" }
```

**POST `/api/manual-test-sets/:id/push`**
```json
// Request
{ "target": "xray" | "ado" }

// Response 200
{
  "pushed": 4,
  "testCases": [
    { "id": "uuid", "externalId": "XRAY-123", "externalUrl": "https://..." },
    { "id": "uuid", "externalId": "XRAY-124", "externalUrl": "https://..." }
  ]
}
```

---

## Project Structure

### Nouveaux fichiers

```text
apps/backend/src/
├── services/
│   └── manual-tests/
│       ├── ManualTestService.ts          ← orchestrateur principal
│       ├── ManualTestService.test.ts     ← tests unitaires
│       └── prompts/
│           └── manual-test-v1.0.ts       ← prompt LLM
├── routes/
│   └── manual-tests.ts                  ← CRUD + push + validate + resync

apps/frontend/src/
├── components/
│   ├── ManualTestList.tsx               ← liste éditable des cas de test
│   ├── ManualTestEditor.tsx             ← édition inline d'un cas
│   ├── ManualTestValidateButton.tsx     ← bouton validation lot
│   └── ManualTestPushButton.tsx         ← bouton push Xray/ADO
├── pages/
│   └── StoryDetailPage.tsx              ← nouvel onglet "Tests manuels"
```

### Fichiers modifiés

```text
apps/backend/src/
├── services/generation/
│   ├── GenerationService.ts             ← ajout paramètre manualTestSetId
│   └── prompts/generation-v1.0.ts       ← section optionnelle tests manuels
├── routes/generations.ts                ← champ manualTestSetId dans POST
├── db/schema.ts                         ← +2 tables, +1 colonne

apps/frontend/src/
├── pages/StoryDetailPage.tsx            ← onglet "Tests manuels" ajouté

packages/shared-types/src/index.ts       ← types ManualTestSet, ManualTestCase
```

---

## Estimation

| Phase | Effort estimé |
|---|---|
| Phase 1 — Schema + ManualTestService + prompt | ~8h |
| Phase 2 — Routes API + tests unitaires | ~5h |
| Phase 3 — Push Xray/ADO (réutilise connectors) | ~5h |
| Phase 4 — Frontend (liste, édition, validation) | ~8h |
| Phase 5 — Injection dans GenerationService | ~4h |
| Phase 6 — Resync depuis Xray/ADO (P2) | ~5h |
| **Total** | **~35h** (~3-4 semaines à 8-10h/semaine) |

**Objectif de livraison** : avant la démo Itecor début juin 2026.
