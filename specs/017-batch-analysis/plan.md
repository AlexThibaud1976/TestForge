# Plan Technique — Analyse Batch Sprint

> 2026-03-26

---

## Summary

Backend : nouvel endpoint `POST /api/analyses/batch` avec concurrence limitée (sémaphore 3). Frontend : modal de progression temps réel via `useRealtimeRow` (déjà existant pour les générations). Aucune migration DB.

---

## Architecture

### Backend

| Endpoint | Description |
|---|---|
| `POST /api/analyses/batch` | Accepte `{ userStoryIds: string[] }` (max 50), retourne `{ batchId, total }`, traite en background |

**Concurrence :** Un sémaphore simple (compteur + queue Promise) limite à 3 analyses LLM simultanées. Chaque analyse terminée update la DB → Supabase Realtime notifie le frontend.

Le `batchId` est un UUID généré côté serveur. Le frontend écoute les updates sur la table `analyses` filtrées par les `userStoryId` soumis.

### Frontend

| Composant | Responsabilité |
|---|---|
| `BatchAnalysisModal` | Modal overlay : progression + résumé |
| `useBatchAnalysis` | Hook : soumission batch + écoute Realtime des résultats |

### Aucune migration DB

Les analyses sont créées individuellement dans la table `analyses` existante — le batch est une orchestration, pas une structure.

---

## Stratégie de Test

### Backend (5 tests)
- `POST /api/analyses/batch should accept array of userStoryIds`
- `should reject arrays > 50 items`
- `should return batchId and total count`
- `should only process stories belonging to the team`
- `should handle individual analysis failures gracefully`

### Frontend (6 tests)
- `useBatchAnalysis should track progress (completed/total)`
- `BatchAnalysisModal should render progress bar`
- `should show score for each completed US`
- `should show summary when all complete`
- `should display top 3 worst scores in summary`
- `should handle errors without crashing`

---

## Fichiers

### À créer (8)
```
apps/backend/src/routes/__tests__/analyses.batch.test.ts
apps/frontend/src/hooks/useBatchAnalysis.ts
apps/frontend/src/hooks/useBatchAnalysis.test.ts
apps/frontend/src/components/batch/BatchAnalysisModal.tsx
apps/frontend/src/components/batch/BatchAnalysisModal.test.tsx
apps/frontend/src/components/batch/BatchSummary.tsx
```

### À modifier (2)
```
apps/backend/src/routes/analyses.ts           — ajout route POST /batch
apps/frontend/src/pages/StoriesPage.tsx       — bouton "Analyser tout le sprint" → ouvre modal
```

---

## Risques

| Risque | Mitigation |
|---|---|
| Rate limit LLM (OpenAI 10 req/min sur certains plans) | Sémaphore à 3 + retry x1 |
| Le Realtime Supabase ne push pas les nouvelles rows (insert) aussi fiablement que les updates | Utiliser le pattern insert pending → update success (comme les générations) |
| 50 US en batch → timeout backend | Le endpoint retourne immédiatement, le traitement est en background |
