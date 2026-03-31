# Tasks — TestForge Jira Forge Extension
**Version:** 1.0.0
**Date:** 2026-03-29
**Feature branch:** `012-jira-forge-extension`
**Estimation totale :** ~28h
**Voir aussi:** spec.md, plan.md

---

> **Convention :** `[P]` = task prioritaire pour le chemin critique démo juin.
> Les phases 1–3 sont le backend. Les phases 4–5 sont l'extension Forge. La phase 6 est la démo et docs.

---

## Phase 1 — Backend : API Tokens (~5h)

**But :** Permettre la génération et validation de tokens API pour lier l'extension Forge à une équipe TestForge.

### Tests (RED first)

- [ ] T001 [P] Écrire test unitaire `ApiTokenService.generate()` : retourne token brut + hash stocké, format `tf_` + 32 hex
- [ ] T002 [P] Écrire test unitaire `ApiTokenService.validate(token)` : token valide → teamId, token révoqué → null, token inexistant → null
- [ ] T003 [P] Écrire test unitaire `ApiTokenService.revoke(id, teamId)` : soft delete + vérification ownership
- [ ] T004 Écrire test intégration `POST /api/tokens` : création, réponse one-time, unicité
- [ ] T005 Écrire test intégration `DELETE /api/tokens/:id` : 204, soft delete, autre team → 403
- [ ] T006 Écrire test intégration `POST /api/jira-panel/token/validate` : token valide → 200 + teamName, révoqué → 401
- [ ] T007 Vérifier RED sur tous les tests
- [ ] T008 Vérifier non-régression : routes existantes non impactées

### Implémentation (GREEN)

- [ ] T009 [P] Ajouter table `api_tokens` dans `apps/backend/src/db/schema.ts`
- [ ] T010 [P] Générer migration Drizzle
- [ ] T011 [P] Créer `apps/backend/src/services/apiTokens/ApiTokenService.ts` :
  - `generate(teamId, name)` → `{ tokenRaw, id }`
  - `validate(tokenRaw)` → `{ teamId, teamName } | null`
  - `revoke(id, teamId)` → void
  - `list(teamId)` → ApiToken[]
- [ ] T012 [P] Créer `apps/backend/src/routes/tokens.ts` :
  - `GET /api/tokens` — liste (JWT auth standard)
  - `POST /api/tokens` — génération
  - `DELETE /api/tokens/:id` — révocation
- [ ] T013 [P] Créer `apps/backend/src/routes/jiraPanel.ts` :
  - `POST /api/jira-panel/token/validate` (public)
- [ ] T014 Enregistrer les routes dans `apps/backend/src/index.ts`
- [ ] T015 Vérifier GREEN + refactor

**Checkpoint :** Les tokens peuvent être générés, validés et révoqués. 6 tests au vert.

---

## Phase 2 — Backend : Scoring Heuristique (~4h)

**But :** Calculer un score de testabilité sans LLM pour le mode anonyme.

### Tests (RED first)

- [ ] T016 [P] Écrire test unitaire `HeuristicScoringService.score(summary, description)` sur US vide → score bas
- [ ] T017 [P] Écrire test sur US avec format INVEST complet → score haut
- [ ] T018 Écrire test sur chaque dimension individuellement (clarity, acceptanceCriteria, testData)
- [ ] T019 Écrire test `generateSuggestions()` : US sans AC → suggestion AC présente
- [ ] T020 Écrire test `GET /api/jira-panel/score` (sans token) : retourne score heuristique
- [ ] T021 Écrire test `GET /api/jira-panel/score` (token invalide) → mode heuristique (dégradé gracieux)
- [ ] T022 Vérifier RED

### Implémentation (GREEN)

- [ ] T023 [P] Créer `apps/backend/src/services/heuristic/HeuristicScoringService.ts` :
  - `score(summary: string, description: string)` → `JiraPanelScore`
  - Implémentation des 3 dimensions (voir `plan.md §3`)
  - `generateSuggestions(scores)` → string[]
- [ ] T024 [P] Ajouter route `GET /api/jira-panel/score` dans `jiraPanel.ts` :
  - Sans token → appel `HeuristicScoringService`
  - Avec token valide → lookup en cache DB d'abord (voir Phase 3)
- [ ] T025 Vérifier GREEN + refactor

**Checkpoint :** Score heuristique fonctionnel en < 100ms. 7 tests au vert.

---

## Phase 3 — Backend : Mode Authentifié + Analyse depuis Forge (~4h)

**But :** Retourner le score LLM mis en cache, ou permettre de déclencher une analyse depuis l'extension.

### Tests (RED first)

- [ ] T026 [P] Écrire test `GET /api/jira-panel/score` (token valide + US déjà analysée) → retourne score LLM du cache
- [ ] T027 [P] Écrire test (token valide + US non analysée) → retourne `{ status: 'not_analyzed' }`
- [ ] T028 [P] Écrire test `POST /api/jira-panel/analyze` (token valide) → 202 + analysisId
- [ ] T029 Écrire test (cloudId ne correspond à aucune sourceConnection de l'équipe) → 404 clair
- [ ] T030 Vérifier RED

### Implémentation (GREEN)

- [ ] T031 [P] Dans `GET /api/jira-panel/score` (branche authentifiée) :
  - Valider token → teamId
  - Chercher `sourceConnection` dont `cloudId` correspond à l'instance Jira
  - Chercher `userStory` dont `externalId = issueKey` dans cette connexion
  - Si trouvée + analyse existante → retourner score LLM (mapper `AnalysisResult` → `JiraPanelScore`)
  - Sinon → `{ mode: 'llm', status: 'not_analyzed' }`
- [ ] T032 [P] `POST /api/jira-panel/analyze` :
  - Valider token + cloudId
  - Trouver ou créer `userStory` avec `summary` + `description` passés
  - Déléguer à `AnalysisService.analyze()` (service existant — ne pas dupliquer)
  - Retourner `202 Accepted` + `{ analysisId }`
- [ ] T033 Construire `testforgeUrl` = `https://app.testforge.io/stories?issueKey=:key&connectionId=:id`
- [ ] T034 Vérifier GREEN + refactor + non-régression routes existantes

**Checkpoint :** Tout le backend est fonctionnel. 9 tests supplémentaires au vert.

---

## Phase 4 — Extension Forge : Setup & Infrastructure (~4h)

**But :** Scaffolding de l'app Forge dans le monorepo, configuration et communication frontend ↔ backend.

- [ ] T035 [P] Installer Forge CLI : `npm install -g @forge/cli`
- [ ] T036 [P] Créer `apps/jira-forge/` avec `forge create` (template Custom UI + React)
- [ ] T037 [P] Adapter `package.json` pour pnpm workspace (`apps/jira-forge/package.json`)
- [ ] T038 [P] Configurer `manifest.yml` :
  - Module `jira:issuePanel` avec `testforge-score-panel`
  - Permissions `read:jira-work`, `storage:app`
  - External fetch whitelisted vers backend TestForge (prod + localhost)
- [ ] T039 [P] Configurer `tsconfig.json` avec strict mode
- [ ] T040 [P] Créer `useForgeContext.ts` : extraire `issueKey`, `cloudId`, `summary`, `description` depuis `@forge/bridge`
- [ ] T041 [P] Créer `useTokenStorage.ts` : read/write/delete token via `@forge/api` Storage API
- [ ] T042 [P] Créer `useTestForgeScore.ts` : appel `GET /api/jira-panel/score` via `forge.fetch()`, gestion états (loading / heuristic / llm / not_analyzed / error)
- [ ] T043 Vérifier que `forge tunnel` fonctionne avec le backend local

**Checkpoint :** L'extension s'affiche dans Jira (même vide). Tunnel fonctionnel.

---

## Phase 5 — Extension Forge : UI Complète (~8h)

**But :** Implémenter les 3 états visuels du panel.

### Tests unitaires React

- [ ] T044 Test `ScoreGauge` : score 0 → rouge, 50 → jaune, 80 → vert
- [ ] T045 Test `DimensionBars` : 3 barres en mode heuristique, 5 en mode LLM
- [ ] T046 Test `ConnectForm` : état idle / loading / error / success
- [ ] T047 Test `App` : affiche `AnonymousPanel` si pas de token, `AuthPanel` si token

### Composants (GREEN)

- [ ] T048 [P] `ScoreGauge.tsx` : cercle SVG avec score centré, couleur dynamique (rouge < 50, jaune 50-74, vert ≥ 75)
- [ ] T049 [P] `DimensionBars.tsx` : barre + label + valeur pour chaque dimension (compact, max 5 items)
- [ ] T050 [P] `SuggestionList.tsx` : liste 💡 + texte, max 3 items
- [ ] T051 [P] `LoadingState.tsx` : spinner + texte d'étape (Analyse en cours...)
- [ ] T052 [P] `ConnectForm.tsx` : input token + bouton Valider + feedback inline (erreur/succès)
- [ ] T053 [P] `AnonymousPanel.tsx` :
  - ScoreGauge + DimensionBars (3 dimensions) + SuggestionList
  - Encart "Score IA complet → Connecter" + lien "Essayer gratuitement"
  - Bouton "Connecter TestForge" → affiche `ConnectForm`
- [ ] T054 [P] `AuthPanel.tsx` (US analysée) :
  - ScoreGauge + DimensionBars (5 dimensions) + date d'analyse
  - Bouton "Générer les tests →" (deep-link, désactivé si score < 50)
  - Bouton "Ré-analyser" + "Déconnecter"
- [ ] T055 [P] `NotAnalyzedPanel.tsx` (US non analysée, mode auth) :
  - Message informatif
  - Bouton "Analyser maintenant" → `POST /api/jira-panel/analyze` + polling status
  - Bouton "Ouvrir dans TestForge →"
- [ ] T056 [P] `App.tsx` : router entre les 3 états selon `useTestForgeScore` + `useTokenStorage`
- [ ] T057 CSS/styling : cohérence avec les couleurs TestForge, responsive ~300–450px
- [ ] T058 Vérifier tous les tests au vert
- [ ] T059 Test end-to-end manuel : anonymous → connect → score LLM → generate link

**Checkpoint :** Panel complet fonctionnel sur l'instance Jira de test, les 3 états visibles.

---

## Phase 6 — Interface TestForge : Section API Tokens (~2h)

**But :** Permettre aux utilisateurs de générer leur token depuis TestForge Settings.

- [ ] T060 [P] Ajouter section "API Tokens" dans `SettingsPage.tsx`
- [ ] T061 [P] Composant `ApiTokensList.tsx` : liste des tokens avec nom + date création + dernière utilisation + bouton Révoquer
- [ ] T062 [P] Composant `CreateTokenDialog.tsx` : dialog shadcn → champ nom → génère → affiche token one-time avec bouton Copier
- [ ] T063 Intégrer les appels API (`GET /api/tokens`, `POST /api/tokens`, `DELETE /api/tokens/:id`)
- [ ] T064 Test unitaire `CreateTokenDialog` : état idle / loading / token affiché / copié

**Checkpoint :** Le workflow complet est réalisable sans sortir des deux apps.

---

## Phase 7 — Démo & Documentation (~1h)

- [ ] T065 [P] Configurer `forge tunnel` + backend local pour la démo juin
- [ ] T066 [P] Vérifier que l'instance Jira de test (instance perso Alexandre) affiche le panel
- [ ] T067 [P] Préparer les données de démo : 1 US avec score bas (mode anonyme), 1 US analysée (mode auth)
- [ ] T068 Mettre à jour `README.md` : section "Jira Forge Extension — Setup Dev"
- [ ] T069 Mettre à jour `UserGuideDocs.tsx` : section "Connecter l'extension Jira"
- [ ] T070 Ajouter le segment démo Forge dans le `DEMO-SCRIPT`

---

## Résumé des estimations

| Phase | Description | Effort |
|---|---|---|
| 1 | API Tokens backend | ~5h |
| 2 | Scoring heuristique | ~4h |
| 3 | Mode authentifié + analyse | ~4h |
| 4 | Setup Forge | ~4h |
| 5 | UI Extension complète | ~8h |
| 6 | Section tokens dans Settings | ~2h |
| 7 | Démo + docs | ~1h |
| **Total** | | **~28h** |

À 8–10h/semaine → **3 à 3,5 semaines** de développement.
