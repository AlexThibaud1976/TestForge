# Implementation Plan: Batch Analysis

**Branch**: `003-batch-analysis` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

Ajouter un endpoint batch qui orchestre N analyses en parallèle (max 3 concurrent), réutilise le cache, et expose un dashboard de scores comparatifs. S'appuie entièrement sur l'`AnalysisService` existant — pas de nouveau service LLM.

## Technical Context

**Primary change**: Nouveau `BatchAnalysisService` qui orchestre `AnalysisService.analyze()` en parallèle avec `p-limit` (concurrency limiter). Côté frontend, nouveau composant `SprintScoreboard` avec tri et export CSV.

**Dependencies ajoutées**: `p-limit` (npm) pour le rate limiting de concurrence.

---

## Architecture

```
[Frontend: "Analyser le sprint"]
       │ POST /api/analyses/batch { userStoryIds: [...] }
       ▼
[BatchAnalysisService]
  │ Pour chaque US:
  │   AnalysisService.analyze(storyId, teamId)  ← réutilise le cache
  │ Parallélisme: p-limit(3) — max 3 appels LLM simultanés
  │ Collect results + errors
  ▼
[Response: { results: [...], errors: [...], stats: { mean, distribution } }]
       │ Supabase Realtime (progress updates)
       ▼
[Frontend: SprintScoreboard]
```

### Pas de nouvelle table

Le batch ne nécessite pas de table dédiée — chaque analyse individuelle est déjà persistée dans `analyses`. Le batch est un orchestrateur stateless qui retourne les résultats agrégés.

Optionnel : un record `batch_runs` pour l'historique (date, N US, score moyen) — à évaluer après la démo.

---

## API Endpoints

**POST `/api/analyses/batch`**
```json
// Request
{ "userStoryIds": ["uuid1", "uuid2", ...] }    // max 50

// Response 200 (après completion)
{
  "results": [
    { "userStoryId": "uuid1", "analysisId": "uuid-a1", "scoreGlobal": 72, "status": "success" },
    { "userStoryId": "uuid2", "analysisId": "uuid-a2", "scoreGlobal": 45, "status": "success" },
    { "userStoryId": "uuid3", "analysisId": null, "scoreGlobal": null, "status": "error", "error": "LLM timeout" }
  ],
  "stats": {
    "total": 10,
    "analyzed": 9,
    "fromCache": 3,
    "errors": 1,
    "meanScore": 64.6,
    "distribution": { "red": 1, "orange": 3, "green": 5 }
  }
}
```

**Alternative streaming** : si le batch est long (> 30s), utiliser Supabase Realtime pour pousser les résultats au fur et à mesure. Le frontend affiche chaque score dès qu'il arrive.

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — BatchAnalysisService + route | ~4h |
| Phase 2 — Frontend SprintScoreboard | ~6h |
| Phase 3 — Export CSV + tri par dimension | ~2h |
| **Total** | **~12h** |
