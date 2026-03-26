# Checklist d'Implémentation — Historique Arborescent

> Dernière mise à jour : 2026-03-26
> Estimation totale : ~10-12h
> **Prérequis :** Feature 002-p1-project-filter mergée (hook `useConnectionFilter`)

---

## Phase 1 : Backend — Nouvel endpoint enrichi (2.5h)

**But :** Créer `GET /api/generations/history` avec join sur analyses → userStories → sourceConnections.

### 1a — Tests endpoint (RED)

- [ ] T001 Écrire test : `GET /api/generations/history should return enriched generations with US and connection data`
- [ ] T002 Écrire test : `should return null fields for orphan generations (no userStoryId)`
- [ ] T003 Écrire test : `should filter by connectionId query param`
- [ ] T004 Écrire test : `should only return generations for the authenticated team`
- [ ] T005 Écrire test : `should return max 50 results ordered by createdAt desc`
- [ ] T006 Écrire test : `should return empty array when no generations exist`
- [ ] T007 Écrire test : `GET /api/generations/history should not conflict with GET /api/generations/:id`
- [ ] T008 Vérifier que tous les tests échouent (RED)

### 1b — Implémentation endpoint (GREEN)

- [ ] T009 Ajouter `router.get('/history', ...)` dans `apps/backend/src/routes/generations.ts` — **AVANT la route `/:id`** (sinon "history" sera interprété comme un UUID)
- [ ] T010 Implémenter le LEFT JOIN : `generations → analyses → userStories → sourceConnections`
- [ ] T011 Ajouter le filtre optionnel `connectionId` (via query param)
- [ ] T012 Ajouter le filtre `teamId` (via JWT, comme les autres routes)
- [ ] T013 Limiter à 50 résultats, order by `createdAt DESC`
- [ ] T014 Vérifier que tous les tests passent (GREEN)
- [ ] T015 Vérifier non-régression : `GET /api/generations` et `GET /api/generations/:id` inchangés

**Checkpoint :** Endpoint fonctionnel, 7 tests au vert. Ancien endpoint inchangé.

---

## Phase 2 : Hook `useHistoryData` — Test-First (1.5h)

**But :** Fetch les données enrichies et les structurer en arbre ConnectionGroup → StoryGroup → Generations.

### 2a — Tests du hook (RED)

- [ ] T016 Écrire test : `should fetch from /api/generations/history and return grouped data`
- [ ] T017 Écrire test : `should group generations by connectionId then by userStoryId`
- [ ] T018 Écrire test : `should handle empty response (0 groups)`
- [ ] T019 Écrire test : `should place orphan generations (null connectionId) in "Non liées" group`
- [ ] T020 Écrire test : `should pass connectionId filter to API call`
- [ ] T021 Vérifier RED

### 2b — Implémentation du hook (GREEN)

- [ ] T022 Créer `apps/frontend/src/hooks/useHistoryData.ts`
- [ ] T023 Implémenter le fetch vers `GET /api/generations/history`
- [ ] T024 Implémenter l'algorithme de groupement : flat array → `ConnectionGroup[]`
- [ ] T025 Gérer le cas orphelin (connectionId null → groupe "Non liées")
- [ ] T026 Tri : connexions alphabétique, US par dernière génération desc, générations par date desc
- [ ] T027 Vérifier GREEN + refactor

**Checkpoint :** Hook fonctionnel, 5 tests au vert.

---

## Phase 3 : Composants arborescents — Test-First (3.5h)

**But :** Les 4 composants visuels de l'arbre.

### 3a — `GenerationCard` (feuille — corriger les 2 bugs ici)

#### Tests (RED)

- [ ] T028 Écrire test : `should display framework and language dynamically` (fix bug #1)
- [ ] T029 Écrire test : `should NOT show hardcoded "Playwright · TypeScript"` (non-régression)
- [ ] T030 Écrire test : `should navigate to /stories/{userStoryId} on "Voir US" click` (fix bug #2)
- [ ] T031 Écrire test : `should disable "Voir US" when userStoryId is null`
- [ ] T032 Écrire test : `should call download handler on ZIP click`
- [ ] T033 Écrire test : `should show status badge (success/error)`
- [ ] T034 Vérifier RED

#### Implémentation (GREEN)

- [ ] T035 Créer `apps/frontend/src/components/history/GenerationCard.tsx`
- [ ] T036 Afficher `gen.framework` + `gen.language` (capitalize) — PAS de string hardcodée
- [ ] T037 Bouton "Voir US" → `navigate(\`/stories/${userStoryId}\`)` — grisé si null
- [ ] T038 Bouton ZIP → appel handleDownload existant
- [ ] T039 Badge statut (success vert / error rouge)
- [ ] T040 Provider, modèle, durée, date — comme l'actuel mais dans le nouveau composant
- [ ] T041 Vérifier GREEN + refactor

### 3b — `StoryGroup` (niveau 2 collapsible)

#### Tests (RED)

- [ ] T042 Écrire test : `should render externalId and title`
- [ ] T043 Écrire test : `should show generation count`
- [ ] T044 Écrire test : `should toggle collapse on click`
- [ ] T045 Écrire test : `should render children (GenerationCards) when expanded`
- [ ] T046 Vérifier RED

#### Implémentation (GREEN)

- [ ] T047 Créer `apps/frontend/src/components/history/StoryGroup.tsx`
- [ ] T048 Header : `externalId · title` + compteur ("3 générations")
- [ ] T049 Logique collapse/expand avec état local `useState<boolean>`
- [ ] T050 Animation CSS transition (height ou max-height, 150ms)
- [ ] T051 Icône ▼ (ouvert) / ► (fermé)
- [ ] T052 Vérifier GREEN + refactor

### 3c — `ConnectionGroup` (niveau 1 collapsible)

#### Tests (RED)

- [ ] T053 Écrire test : `should render connection name with Jira icon for type jira`
- [ ] T054 Écrire test : `should render connection name with ADO icon for type azure_devops`
- [ ] T055 Écrire test : `should show total generation count across all stories`
- [ ] T056 Écrire test : `should toggle collapse on click`
- [ ] T057 Écrire test : `should render "Non liées" for null connection`
- [ ] T058 Vérifier RED

#### Implémentation (GREEN)

- [ ] T059 Créer `apps/frontend/src/components/history/ConnectionGroup.tsx`
- [ ] T060 Header : icône type (🔵/🟣) + nom connexion + compteur total générations
- [ ] T061 Logique collapse/expand — premier groupe ouvert par défaut
- [ ] T062 Label "Non liées" pour le groupe orphelin (connectionId null)
- [ ] T063 Vérifier GREEN + refactor

### 3d — `HistoryTree` (assemblage)

- [ ] T064 Créer `apps/frontend/src/components/history/HistoryTree.tsx`
- [ ] T065 Itérer sur `ConnectionGroup[]` → rendre les `ConnectionGroup` avec leurs `StoryGroup` et `GenerationCard`
- [ ] T066 Passer le handleDownload en prop cascade

**Checkpoint :** 4 composants, 15 tests au vert.

---

## Phase 4 : Intégration dans HistoryPage (1.5h)

**But :** Réécrire `HistoryPage.tsx` avec le nouvel arbre et le filtre connexion.

- [ ] T067 Réécrire `apps/frontend/src/pages/HistoryPage.tsx` :
  - Utiliser `useConnectionFilter()` pour le dropdown
  - Utiliser `useHistoryData(connectionId)` pour les données arborescentes
  - Rendre `<ConnectionFilter>` en haut + `<HistoryTree>` en dessous
- [ ] T068 Conserver la logique `handleDownload` existante (import supabase + fetch blob)
- [ ] T069 Conserver le message vide actuel (0 générations)
- [ ] T070 Le compteur "X générations" utilise le total des données filtrées
- [ ] T071 Le filtre connexion est persisté dans l'URL via `useConnectionFilter`
- [ ] T072 Test manuel complet : arbre, collapse, filtre, téléchargement ZIP, "Voir US", URL sharing

**Checkpoint :** Page fonctionnelle end-to-end en local.

---

## Phase 5 : Documentation & Polish (1h)

- [ ] T073 Mettre à jour le User Guide : section "Historique" avec description de l'arbre
- [ ] T074 Vérifier que `pnpm typecheck` passe sans erreur
- [ ] T075 Vérifier que `pnpm lint` passe sans erreur
- [ ] T076 Vérifier que `pnpm test` passe (tous les tests existants + nouveaux)
- [ ] T077 Vérifier non-régression : l'ancienne route `GET /api/generations` retourne toujours les mêmes données
- [ ] T078 Pas de `any`, pas de TODO oublié, pas de console.log
- [ ] T079 Commit + push → CI GitHub Actions verte

**Checkpoint :** Feature prête pour merge. CI verte. Docs à jour.

---

## Récapitulatif

| Phase | Tâches | Temps estimé | Dépendance |
|---|---|---|---|
| 1. Backend endpoint | T001–T015 | 2.5h | — |
| 2. Hook useHistoryData | T016–T027 | 1.5h | Phase 1 |
| 3. Composants arbre | T028–T066 | 3.5h | Phase 2 |
| 4. Intégration page | T067–T072 | 1.5h | Phase 3 + P1 mergé |
| 5. Docs & polish | T073–T079 | 1h | Phase 4 |
| **Total** | **79 tâches** | **~10h** | |

---

> 📊 Progression : 0 / 79 tâches complétées
> 📎 Voir spec.md et plan.md pour les détails fonctionnels et techniques.
> ⚠️ Prérequis : feature 002-p1-project-filter (hook useConnectionFilter) doit être mergée.
