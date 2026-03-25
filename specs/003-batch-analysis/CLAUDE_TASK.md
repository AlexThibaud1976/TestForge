# CLAUDE_TASK — 003-batch-analysis

> Analyse en lot de toutes les US d'un sprint avec dashboard de scores comparatifs.
> Usage : `claude < CLAUDE_TASK.md`

---

## Contexte

TestForge — monorepo pnpm, `apps/backend/` (Express + TS strict + Drizzle), `apps/frontend/` (React + Vite + shadcn/ui), `packages/shared-types/`. Voir `CLAUDE.md` à la racine pour les commandes.

**Spec** : `specs/003-batch-analysis/spec.md`
**Tasks** : `specs/003-batch-analysis/tasks.md`

## Règles

- TypeScript strict, aucun `any`
- Réutiliser `AnalysisService.analyze()` existant (apps/backend/src/services/analysis/AnalysisService.ts)
- Validation Zod sur les routes
- Tests Vitest > 80% coverage sur BatchAnalysisService
- Conventional Commits

---

## PHASE 1 — BatchAnalysisService + Route (~4h)

### 1.1 — Installer p-limit

```bash
pnpm --filter backend add p-limit
```

### 1.2 — Créer BatchAnalysisService

Créer `apps/backend/src/services/analysis/BatchAnalysisService.ts`.

Le service prend un tableau de `userStoryIds` et appelle `AnalysisService.analyze()` pour chaque US, avec un maximum de 3 appels LLM simultanés via `p-limit(3)`.

L'`AnalysisService` gère déjà le cache — si une US a été analysée il y a < 24h, le cache est réutilisé automatiquement. Le batch n'a pas besoin de gérer le cache lui-même.

Collecter les résultats et les erreurs séparément. Calculer les stats : meanScore, distribution (red < 40, orange 40-70, green > 70), fromCache count.

Signature :
```typescript
async analyzeBatch(userStoryIds: string[], teamId: string): Promise<BatchResult>
```

### 1.3 — Route POST /api/analyses/batch

Ajouter dans `apps/backend/src/routes/analyses.ts` (fichier existant) :

```typescript
const batchSchema = z.object({
  userStoryIds: z.array(z.string().uuid()).min(1).max(50),
});
```

Endpoint : `POST /api/analyses/batch`, requireAuth.

### 1.4 — Tests unitaires

Fichier : `apps/backend/src/services/analysis/BatchAnalysisService.test.ts`

Mocker `AnalysisService.analyze()`. Tests :
- 5 US → 5 résultats, stats correctes
- 2 US en cache + 3 nouvelles → fromCache = 2
- 1 US en erreur → 4 résultats + 1 erreur, les autres ne sont pas bloquées
- 0 US → erreur validation

Vérifier : `pnpm --filter backend test && pnpm --filter backend typecheck`

---

## PHASE 2 — Frontend SprintScoreboard (~6h)

### 2.1 — Composants

Créer dans `apps/frontend/src/components/` :

**SprintScoreboard.tsx** :
- Header : score moyen (gros texte), badges répartition (N rouge, N orange, N vert)
- Table shadcn/ui avec colonnes : titre US, score global (barre colorée), scores dimensions, lien détail
- Tri par colonne cliquable
- Loading state (skeleton)

**BatchAnalyzeButton.tsx** :
- Bouton "Analyser le sprint" ou "Analyser la sélection (N)"
- Barre de progression pendant le batch (poll ou realtime)
- Disabled si batch en cours

### 2.2 — Intégration StoriesPage

Modifier `apps/frontend/src/pages/StoriesPage.tsx` :
- Ajouter des checkboxes de sélection sur les US cards
- Placer `BatchAnalyzeButton` dans la barre d'actions en haut
- Afficher `SprintScoreboard` en haut de page quand les résultats sont disponibles

---

## PHASE 3 — Export CSV (~2h)

- Bouton "Exporter CSV" sur le SprintScoreboard
- Colonnes : titre, score global, clarté, complétude, testabilité, edge cases, AC
- Générer côté frontend avec `Blob` + `URL.createObjectURL`

---

## Vérification finale

```bash
pnpm --filter backend test && pnpm --filter backend typecheck && pnpm --filter backend lint
pnpm --filter frontend typecheck
git commit -m "feat: 003-batch-analysis — analyze full sprint with scoreboard"
```
