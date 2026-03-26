# Checklist — Analyse Batch Sprint

> Estimation : ~5h | Prérequis : aucun (utilise Realtime existant)

---

## Phase 1 : Backend — Endpoint batch (1.5h)

- [ ] T001 Écrire 5 tests pour `POST /api/analyses/batch` (RED)
- [ ] T002 Créer le sémaphore de concurrence (utility function, pool de 3)
- [ ] T003 Ajouter route `POST /batch` dans `apps/backend/src/routes/analyses.ts` (AVANT `/:id`)
- [ ] T004 Validation Zod : `{ userStoryIds: z.array(z.string().uuid()).min(1).max(50) }`
- [ ] T005 Retour immédiat `{ batchId, total }`, traitement en background via `void processAll()`
- [ ] T006 Dans `processAll` : itérer avec sémaphore, appeler `analysisService.analyze()` pour chaque US
- [ ] T007 Vérifier GREEN + non-régression `pnpm test`

**Checkpoint :** Endpoint fonctionnel, 5 tests au vert.

---

## Phase 2 : Hook `useBatchAnalysis` — Test-First (1h)

- [ ] T008 Écrire 3 tests pour le hook (RED)
- [ ] T009 Créer `apps/frontend/src/hooks/useBatchAnalysis.ts`
- [ ] T010 Implémenter : soumission POST /batch, écoute Realtime sur table `analyses` pour les userStoryIds soumis
- [ ] T011 State : `{ results: Map<storyId, Analysis | 'pending' | 'error'>, completed: number, total: number, done: boolean }`
- [ ] T012 Vérifier GREEN

---

## Phase 3 : Modal de progression — Test-First (1.5h)

- [ ] T013 Écrire 4 tests pour `BatchAnalysisModal` (RED)
- [ ] T014 Créer `apps/frontend/src/components/batch/BatchAnalysisModal.tsx`
- [ ] T015 Barre de progression : `completed / total` avec animation width transition
- [ ] T016 Liste scrollable : chaque US avec statut (⏳/🔄/✅ score/❌)
- [ ] T017 Créer `BatchSummary.tsx` : score moyen, distribution vert/jaune/rouge, top 3 worst
- [ ] T018 Afficher le résumé quand `done === true`
- [ ] T019 Bouton "Fermer" qui ferme le modal
- [ ] T020 Vérifier GREEN

---

## Phase 4 : Intégration + Polish (1h)

- [ ] T021 Intégrer le bouton "Analyser tout le sprint" dans `StoriesPage.tsx` → ouvre le modal
- [ ] T022 Le bouton collecte les IDs des stories **visibles** (filtrées) et les passe au hook
- [ ] T023 Après fermeture du modal, re-fetch les stories (scores mis à jour si affichés)
- [ ] T024 Test manuel complet : filtrer par projet → analyser → progression → résumé → fermer
- [ ] T025 `pnpm typecheck && pnpm lint && pnpm test`
- [ ] T026 Mettre à jour le User Guide

---

> 📊 Progression : 0 / 26 tâches | ~5h estimées
