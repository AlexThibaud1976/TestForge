# Tasks — Batch Analysis

**Branch**: `003-batch-analysis` | **Date**: 2026-03-25

---

## Phase 1: BatchAnalysisService + Route (~4h)

**Goal**: Endpoint batch fonctionnel qui orchestre N analyses en parallèle.

- [ ] T001 [P] Installer `p-limit` : `pnpm --filter backend add p-limit`
- [ ] T002 [P] Créer `apps/backend/src/services/analysis/BatchAnalysisService.ts` :
  - Méthode `analyzeBatch(userStoryIds: string[], teamId: string)` — itère avec `p-limit(3)`, appelle `AnalysisService.analyze()` pour chaque US, collecte résultats + erreurs
  - Calcul des stats : meanScore, distribution (red < 40, orange 40-70, green > 70), fromCache count
  - Catch les erreurs par US sans bloquer le reste
- [ ] T003 [P] Ajouter route `POST /api/analyses/batch` dans `apps/backend/src/routes/analyses.ts` — body `{ userStoryIds: z.array(z.string().uuid()).max(50) }`, requireAuth, retourne results + stats
- [ ] T004 Tests unitaires `BatchAnalysisService` — LLM mocké, vérifier parallélisme (max 3), cache réutilisé, erreurs isolées
- [ ] T005 Vérifier : `pnpm --filter backend test && typecheck`

**Checkpoint** : `POST /api/analyses/batch` retourne les scores de N US.

---

## Phase 2: Frontend SprintScoreboard (~6h)

**Goal**: Dashboard visuel des scores du sprint avec code couleur.

- [ ] T006 [P] Créer `apps/frontend/src/components/SprintScoreboard.tsx` :
  - Header : score moyen (gros chiffre), répartition rouge/orange/vert (badges)
  - Table : titre US, score global (barre colorée), scores par dimension (mini-barres), lien vers détail
  - Tri par colonne (score global, par dimension)
  - États : loading (skeleton), erreur par US (badge rouge), cache hit (badge gris "en cache")
- [ ] T007 [P] Créer `apps/frontend/src/components/BatchAnalyzeButton.tsx` :
  - Bouton "Analyser le sprint" (ou "Analyser la sélection" si checkbox actives)
  - Barre de progression pendant le batch
  - Disabled si batch en cours
- [ ] T008 Intégrer dans `apps/frontend/src/pages/StoriesPage.tsx` :
  - Checkboxes de sélection sur les US cards
  - `BatchAnalyzeButton` dans la barre d'actions
  - `SprintScoreboard` affiché après le batch (en haut de page ou en modal)
- [ ] T009 Ajouter filtre par sprint dans la page Stories (si pas déjà présent) — dropdown des sprints disponibles

**Checkpoint** : Sélectionner N US → Analyser → Scoreboard avec scores triés et colorés.

---

## Phase 3: Export CSV + Polish (~2h)

- [ ] T010 Ajouter bouton "Exporter CSV" sur le SprintScoreboard — génère un CSV côté frontend avec les colonnes : titre, score global, clarté, complétude, testabilité, edge cases, AC, statut
- [ ] T011 Ajouter le score moyen et la distribution en en-tête du CSV
- [ ] T012 Gérer le cas 50+ US : pagination + warning dans le BatchAnalyzeButton

**Checkpoint** : Export CSV fonctionnel, gestion des gros sprints.

---

## Dependencies

- Phase 1 : aucune dépendance, peut démarrer immédiatement
- Phase 2 : dépend de Phase 1 (API nécessaire)
- Phase 3 : dépend de Phase 2
