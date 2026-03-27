# Checklist d'Implémentation — 008 Progress Tracking

> Dernière mise à jour : 27 mars 2026
> Spec : specs/008-progress-tracking/spec.md
> Plan : specs/008-progress-tracking/plan.md

---

## Phase 1 : Migrations DB & Schema Drizzle (~1.5h)

- [ ] Créer migration `XXXX_add_analysis_async_columns.sql` : `status TEXT NOT NULL DEFAULT 'success'`, `progress_step TEXT`, `duration_ms INTEGER` sur `analyses`
- [ ] Créer migration `XXXX_add_generation_progress_step.sql` : `progress_step TEXT` sur `generations`
- [ ] Mettre à jour `apps/backend/src/db/schema.ts` : ajouter les 3 colonnes sur `analyses` et 1 colonne sur `generations`
- [ ] Exécuter `pnpm db:generate` + `pnpm db:migrate`
- [ ] Vérifier dans Drizzle Studio que les colonnes existent et que les analyses existantes ont `status = 'success'`
- [ ] Exécuter `pnpm typecheck` — zéro erreur

**✅ Fin Phase 1 : schéma DB prêt, aucune régression sur le code existant (colonnes nullable/default)**

---

## Phase 2 : EstimateService + Route (~2h)

- [ ] Écrire les tests `EstimateService.test.ts` (RED) :
  - Médiane avec 5+ samples team → `source: 'team'`
  - Fallback global avec < 5 team samples → `source: 'global'`
  - Fallback hardcodé avec < 5 global samples → `source: 'default'`
  - Type `analysis` vs `generation`
  - Médiane avec nombre pair/impair de samples
- [ ] Implémenter `EstimateService.ts` (GREEN) :
  - Méthode `getEstimate(type, provider, model, teamId): Promise<DurationEstimate>`
  - Requête DB avec `ORDER BY created_at DESC LIMIT 20` + filtre `status = 'success'` + `duration_ms IS NOT NULL`
  - Calcul médiane (tri + valeur centrale)
  - Cascade team → global → default
- [ ] Écrire le test d'intégration pour `GET /api/estimates` (RED) :
  - Avec provider/model explicites
  - Sans provider/model → utilise la config LLM default
  - Paramètre `type` requis
- [ ] Implémenter `routes/estimates.ts` (GREEN) :
  - Validation Zod : `type` requis (`analysis | generation`), `provider` et `model` optionnels
  - Si provider/model absents → récupérer la LLM config default de l'équipe
  - Monter la route dans `routes/index.ts`
- [ ] Vérifier la route manuellement : `GET /api/estimates?type=analysis`
- [ ] `pnpm test` — tous les tests passent
- [ ] `pnpm typecheck` — zéro erreur

**✅ Fin Phase 2 : le endpoint d'estimation fonctionne, prêt à être consommé par le frontend**

---

## Phase 3 : Refactor AnalysisService en mode async (~3h)

- [ ] Réécrire `AnalysisService.test.ts` (RED) — nouveaux tests :
  - `analyzeWithCache` : cache hit retourne le résultat, cache miss retourne null
  - `createPending` : crée un record avec `status = 'pending'`, `progress_step = null`
  - `processAnalysis` : 
    - Séquence des `progress_step` updates (`preparing` → `calling_llm` → `finalizing` → null)
    - `status` passe à `'success'` en fin de traitement
    - `duration_ms` est calculé correctement
    - En cas d'erreur LLM → `status = 'error'`, `progress_step = null`
  - `analyze` (compat batch) : appelle `createPending` + `processAnalysis` de façon synchrone, retourne le résultat
  - Cache hit via `analyze` → pas de createPending
- [ ] Refactorer `AnalysisService.ts` (GREEN) :
  - Extraire `analyzeWithCache(userStoryId, teamId)` depuis le code existant de `analyze()`
  - Implémenter `createPending(userStoryId, teamId)` — insert en DB avec `status: 'pending'`
  - Implémenter `processAnalysis(analysisId, userStoryId, teamId)` — la logique LLM + 4 updates DB
  - Adapter `analyze()` comme wrapper synchrone (pour le batch)
  - Ajouter `getById(analysisId, teamId)` pour récupérer le résultat final
- [ ] Modifier `routes/analyses.ts` :
  - `POST /api/analyses` : si cache hit → `201` + résultat, si cache miss → `202` + `{ id, status }` + fire-and-forget `processAnalysis()`
  - `GET /api/analyses?userStoryId=` : ajouter filtre `status = 'success'` (ou `eq(analyses.status, 'success')`)
- [ ] Exécuter le test unitaire existant du batch analysis (005) → doit passer sans modification
- [ ] Vérifier manuellement `POST /api/analyses` avec un cache hit → 201
- [ ] Vérifier manuellement `POST /api/analyses` avec un cache miss → 202 + Realtime updates dans Supabase Studio
- [ ] `pnpm test` — tous les tests passent (y compris batch)
- [ ] `pnpm typecheck` — zéro erreur

**✅ Fin Phase 3 : l'analyse est async côté backend, le batch est rétrocompatible, les étapes sont émises via Realtime**

---

## Phase 4 : Ajout progress_step sur GenerationService (~1h)

- [ ] Écrire les tests pour les updates `progress_step` dans `GenerationService` (RED) :
  - Vérifier que `progress_step` passe par `preparing` → `calling_llm` → `finalizing` → null
  - Vérifier que `progress_step = null` quand `status = 'success'`
  - Vérifier que `progress_step = null` quand `status = 'error'`
- [ ] Ajouter les `db.update(generations).set({ progressStep: '...' })` dans `processGeneration()` (GREEN) :
  - Avant la récupération de l'analyse/US/config : `'preparing'`
  - Avant l'appel `client.complete()` : `'calling_llm'`
  - Après le retour LLM, avant le parsing : `'finalizing'`
  - Reset à `null` dans le bloc final (success ou error)
- [ ] `pnpm test` — tous les tests passent
- [ ] `pnpm typecheck` — zéro erreur

**✅ Fin Phase 4 : la génération émet aussi des étapes de progression**

---

## Phase 5 : Composant ProgressTracker (~2h)

- [ ] Écrire les tests `ProgressTracker.test.tsx` (RED) :
  - Rendu avec étape 1 active → "Préparation" a l'indicateur actif
  - Rendu avec étape 2 active → "Préparation" ✓, "Appel LLM" actif
  - Rendu avec toutes les étapes done → 3 checks verts
  - Affichage du compteur de temps formaté (12s / ~18s)
  - Message de dépassement quand elapsed > 1.5x estimated
  - État erreur : étape active marquée en rouge, message visible
- [ ] Implémenter `ProgressTracker.tsx` (GREEN) :
  - Props : `steps`, `currentStep`, `status`, `estimatedMs`, `startedAt`, `errorMessage`
  - `useState` + `setInterval(1000)` pour le compteur de temps
  - Barre de progression capped à 95% tant que status ≠ success
  - Messages adaptatifs (normal, dépassement 1.5x, alerte 3x)
  - Tailwind CSS : transitions fluides, couleurs cohérentes avec le design system
- [ ] Refactor (REFACTOR) : extraire les constantes (seuils, messages) dans un objet config
- [ ] `pnpm test` — tous les tests passent
- [ ] `pnpm typecheck` — zéro erreur

**✅ Fin Phase 5 : composant ProgressTracker testable et prêt à intégrer**

---

## Phase 6 : Intégration StoryDetailPage (~2.5h)

- [ ] Modifier `StoryDetailPage.tsx` — flux analyse :
  - `handleAnalyze` : vérifier le code HTTP de réponse (`201` vs `202`)
  - Si `201` (cache hit) : afficher le résultat directement (comportement actuel)
  - Si `202` (async) : 
    - Récupérer l'estimation via `GET /api/estimates?type=analysis`
    - Stocker `startedAt = Date.now()`
    - Passer en état `loading`, afficher `ProgressTracker`
    - Souscrire via `useRealtimeRow` sur le `id` retourné
  - Sur update Realtime : mapper `progress_step` → `currentStep` du tracker
  - Sur `status === 'success'` : récupérer l'analyse complète via `GET /api/analyses/:id`
- [ ] Modifier `StoryDetailPage.tsx` — flux génération :
  - Avant le `handleGenerate` existant : récupérer l'estimation via `GET /api/estimates?type=generation`
  - Remplacer le bloc spinner (`generationState === 'loading'`) par `ProgressTracker`
  - Mapper les updates Realtime du `useRealtimeRow` existant vers le tracker
- [ ] Ajouter un état `pendingAnalysisId` (comme `pendingGenerationId` existant)
- [ ] Ajouter un second `useRealtimeRow` pour les analyses en pending
- [ ] Tester manuellement :
  - Analyse avec cache hit → résultat instantané, pas de tracker
  - Analyse sans cache → tracker avec 3 étapes, temps cohérent
  - Génération → tracker avec 3 étapes
  - Erreur LLM → message d'erreur dans le tracker
  - Ouvrir une US déjà analysée → résultat affiché normalement (pas de tracker)
- [ ] `pnpm test` — tous les tests passent
- [ ] `pnpm typecheck` — zéro erreur

**✅ Fin Phase 6 : les spinners sont remplacés par les ProgressTrackers dans StoryDetailPage**

---

## Phase 7 : Non-régression & Polish (~1.5h)

- [ ] Tester le batch analysis (feature 005) : lancer un batch de 3+ US → doit fonctionner identiquement
- [ ] Tester la page historique (feature 003) : les analyses existantes s'affichent correctement
- [ ] Tester le dashboard analytics (feature 004) : les métriques ne sont pas impactées
- [ ] Tester le diff comparison (feature 007) : fonctionne sur les analyses avec les nouvelles colonnes
- [ ] Vérifier que le filtre `GET /api/analyses?userStoryId=` ne retourne pas les analyses `pending` ou `error`
- [ ] Ajouter un timeout frontend (90s) : si pas de `success` ou `error` après 90s → afficher "L'opération prend trop de temps. Réessayez." et permettre un retry
- [ ] Ajouter un fallback polling (3s) si la souscription Realtime échoue (détecté par un `onError` ou un `status !== 'SUBSCRIBED'` après 5s)
- [ ] `pnpm test` — tous les tests passent
- [ ] `pnpm typecheck` — zéro erreur
- [ ] `pnpm lint` — zéro warning

**✅ Fin Phase 7 : non-régression validée, edge cases gérés**

---

## Phase 8 : Documentation (~0.5h)

- [ ] Mettre à jour `README.md` : mentionner la progression par étapes et l'estimation de temps
- [ ] Mettre à jour le user guide : décrire le nouveau comportement visuel de l'analyse et de la génération
- [ ] Mettre à jour `DEMO-SCRIPT-v2.md` si pertinent : le tracker est un point de démo intéressant
- [ ] Documenter le endpoint `GET /api/estimates` dans la section API du README

**✅ Fin Phase 8 : documentation à jour**

---

> 📊 Progression : 0 / 47 tâches complétées
> ⏱ Effort estimé total : ~14h (~2 weekends)
