# 🚀 Claude Code — 008 Progress Tracking

> **Comment utiliser ce fichier :**
> Ouvre un terminal à la racine du monorepo `testforge/` et lance :
> ```bash
> claude < specs/008-progress-tracking/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge est un SaaS B2B qui transforme des user stories Jira/ADO en tests automatisés (Playwright/Selenium). Actuellement, les phases d'analyse qualité et de génération de code affichent un simple spinner pendant que le LLM travaille. On veut remplacer ça par un indicateur de progression avec 3 étapes nommées (Préparation / Appel LLM / Résultat) et un temps estimé basé sur l'historique.

**Changement majeur :** L'analyse passe d'un flux synchrone (requête HTTP bloquante) à un flux asynchrone (comme la génération). Le backend émet des étapes intermédiaires via Supabase Realtime.

## Règles de code

- TypeScript strict, pas de `any` implicite
- Imports avec extension `.js`
- Test-first : RED → GREEN → REFACTOR (Vitest)
- Tailwind CSS v4 pour le styling
- Drizzle ORM pour les migrations et requêtes DB
- Toutes les routes API doivent être validées avec Zod
- `pnpm typecheck` + `pnpm test` + `pnpm lint` doivent passer à chaque phase

## Fichiers de référence

- Spec complète : `specs/008-progress-tracking/spec.md`
- Plan technique : `specs/008-progress-tracking/plan.md`
- Checklist : `specs/008-progress-tracking/tasks.md`

---

## TÂCHE 1 — Migrations DB

### Objectif
Ajouter les colonnes nécessaires pour le tracking de progression sur `analyses` et `generations`.

### Fichiers à modifier
- `apps/backend/src/db/schema.ts` — ajouter `status`, `progressStep`, `durationMs` sur `analyses` et `progressStep` sur `generations`

### Détail

Sur la table `analyses`, ajouter :
```typescript
status: text('status').notNull().default('success'),
progressStep: text('progress_step'),
durationMs: integer('duration_ms'),
```

Sur la table `generations`, ajouter :
```typescript
progressStep: text('progress_step'),
```

### Vérification
```bash
cd apps/backend
pnpm db:generate
pnpm db:migrate
pnpm typecheck
```

Vérifier dans Drizzle Studio (`pnpm db:studio`) que les colonnes existent et que les analyses existantes ont `status = 'success'`.

---

## TÂCHE 2 — EstimateService

### Objectif
Créer le service de calcul d'estimation basé sur les durées historiques et la route API correspondante.

### Fichiers à créer
- `apps/backend/src/services/estimates/EstimateService.ts`
- `apps/backend/src/services/estimates/EstimateService.test.ts`
- `apps/backend/src/routes/estimates.ts`

### Fichiers à modifier
- `apps/backend/src/routes/index.ts` — monter la route `/api/estimates`

### Détail

**EstimateService** :
- Méthode `getEstimate(type: 'analysis' | 'generation', provider: string, model: string, teamId: string): Promise<DurationEstimate>`
- Requête : 20 dernières opérations réussies (`status = 'success'`, `duration_ms IS NOT NULL`) pour ce provider/model/teamId
- Si ≥ 5 résultats team → médiane → `source: 'team'`
- Si < 5 team, ≥ 5 global → médiane → `source: 'global'`
- Sinon → `{ estimatedMs: 15000, sampleSize: 0, source: 'default' }` (analyse) ou 25000 (génération)

**Route** :
- `GET /api/estimates?type=analysis&provider=openai&model=gpt-4o`
- `provider` et `model` optionnels — si absents, utiliser la config LLM default de l'équipe
- Validation Zod

### Vérification
```bash
cd apps/backend
pnpm test -- --grep "EstimateService"
pnpm typecheck
```

---

## TÂCHE 3 — Refactor AnalysisService

### Objectif
Transformer le service d'analyse en mode asynchrone tout en conservant la compatibilité avec le batch analysis.

### Fichiers à modifier
- `apps/backend/src/services/analysis/AnalysisService.ts`
- `apps/backend/src/services/analysis/AnalysisService.test.ts`
- `apps/backend/src/routes/analyses.ts`

### Détail

**AnalysisService** — 3 nouvelles méthodes + wrapper compat :

1. `analyzeWithCache(userStoryId, teamId)` → retourne l'analyse en cache ou null
2. `createPending(userStoryId, teamId)` → insert DB avec `status: 'pending'`, retourne `{ id, status }`
3. `processAnalysis(analysisId, userStoryId, teamId)` → traitement complet avec 4 updates DB :
   - `progress_step = 'preparing'` (récup US + LLM config + prompt)
   - `progress_step = 'calling_llm'` (appel LLM)
   - `progress_step = 'finalizing'` (parsing + scores)
   - `status = 'success'`, `progress_step = null`, `duration_ms = ...`, + tous les résultats
4. `analyze(userStoryId, teamId)` → wrapper synchrone pour le batch : cache check → createPending → await processAnalysis → getById

**Route POST /api/analyses** :
- Cache hit → `201` + résultat complet
- Cache miss → `createPending` + fire-and-forget `processAnalysis` (pas de `await`) → `202` + `{ id, status: 'pending' }`

**Route GET /api/analyses?userStoryId=** :
- Ajouter filtre `eq(analyses.status, 'success')` dans le `where`

### Vérification
```bash
cd apps/backend
pnpm test -- --grep "AnalysisService"
pnpm test -- --grep "batch"
pnpm typecheck
# Tester manuellement avec curl :
# curl -X POST http://localhost:3000/api/analyses -H "Authorization: Bearer ..." -d '{"userStoryId":"..."}'
# → 201 (cache hit) ou 202 (async)
```

---

## TÂCHE 4 — GenerationService progress_step

### Objectif
Ajouter les updates `progress_step` dans le flux de génération existant.

### Fichiers à modifier
- `apps/backend/src/services/generation/GenerationService.ts`
- (tests existants à adapter si nécessaire)

### Détail

Dans `processGeneration()`, ajouter 3 updates DB :
1. Avant la récupération de l'analyse/US/config → `db.update(generations).set({ progressStep: 'preparing' }).where(...)`
2. Avant `client.complete()` → `set({ progressStep: 'calling_llm' })`
3. Après le retour LLM, avant le parsing → `set({ progressStep: 'finalizing' })`
4. Dans le bloc final (success ou error) → `set({ progressStep: null })` (déjà existant pour status)

### Vérification
```bash
cd apps/backend
pnpm test -- --grep "GenerationService"
pnpm typecheck
```

---

## TÂCHE 5 — Composant ProgressTracker

### Objectif
Créer le composant React réutilisable qui affiche les étapes de progression et la barre de temps.

### Fichiers à créer
- `apps/frontend/src/components/progress/ProgressTracker.tsx`
- `apps/frontend/src/components/progress/ProgressTracker.test.tsx`

### Détail

**Props** :
```typescript
interface ProgressStep { key: string; label: string; }
interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  estimatedMs: number;
  startedAt: number;
  errorMessage?: string;
}
```

**Comportement** :
- Compteur de temps via `setInterval(1000)` nettoyé au unmount
- Barre = `min(elapsed / estimatedMs, 0.95)` tant que `status !== 'success'`
- `status === 'success'` → barre à 100%, toutes les étapes en ✓
- `elapsed > estimatedMs * 1.5` → "Un peu plus long que d'habitude..."
- `elapsed > estimatedMs * 3` → "Vérification en cours..."
- `status === 'error'` → étape courante en rouge, message d'erreur affiché

**Étapes standard** :
```typescript
const ANALYSIS_STEPS = [
  { key: 'preparing', label: 'Préparation' },
  { key: 'calling_llm', label: 'Appel LLM' },
  { key: 'finalizing', label: 'Résultat' },
];
// Même chose pour la génération
```

### Vérification
```bash
cd apps/frontend
pnpm test -- --grep "ProgressTracker"
pnpm typecheck
```

---

## TÂCHE 6 — Intégration StoryDetailPage

### Objectif
Remplacer les spinners dans StoryDetailPage par le ProgressTracker pour l'analyse et la génération.

### Fichiers à modifier
- `apps/frontend/src/pages/StoryDetailPage.tsx`

### Détail

**Analyse** :
1. Ajouter état `pendingAnalysisId: string | null` (miroir de `pendingGenerationId`)
2. Ajouter `useRealtimeRow('analyses', pendingAnalysisId, ...)` pour écouter les changements
3. Dans `handleAnalyze` :
   - Appeler `POST /api/analyses`
   - Si réponse status HTTP `201` → résultat direct (comportement actuel inchangé)
   - Si réponse status HTTP `202` → stocker le `id` dans `pendingAnalysisId`, récupérer l'estimation via `GET /api/estimates?type=analysis`, stocker `startedAt`, afficher `ProgressTracker`
4. Sur Realtime update : mapper `row.progress_step` → `currentStep`, `row.status` → `status`
5. Quand `status === 'success'` → `GET /api/analyses/:id` pour récupérer le résultat complet

**Génération** :
1. Avant `handleGenerate` : récupérer l'estimation via `GET /api/estimates?type=generation`
2. Remplacer le bloc `generationState === 'loading'` (spinner CSS) par `<ProgressTracker />`
3. Mapper les updates Realtime existants vers le tracker

**Edge cases** :
- Timeout 90s : si `pendingAnalysisId` est set depuis > 90s sans `success` ni `error`, afficher un message de timeout avec bouton retry
- Erreur : bouton "Réessayer" qui reset l'état

### Vérification
```bash
pnpm typecheck
pnpm test
# Tests manuels :
# 1. Analyser une US non-cachée → tracker visible avec étapes
# 2. Analyser une US cachée → résultat instantané
# 3. Générer des tests → tracker visible
# 4. Vérifier que le batch analysis fonctionne toujours
```

---

## TÂCHE 7 — Non-régression & Documentation

### Objectif
Valider la non-régression sur toutes les features existantes et mettre à jour la documentation.

### Tests de non-régression
1. **Batch analysis (005)** : lancer un batch de 3+ US → progression X/N, résultats corrects
2. **History tree (003)** : ouvrir la page historique → les analyses existantes apparaissent
3. **Analytics dashboard (004)** : les compteurs et graphiques sont corrects
4. **Comparison diff (007)** : le diff fonctionne sur les nouvelles analyses
5. **Onboarding (006)** : le flag `testforge_first_analysis` est bien posé après une analyse async réussie

### Documentation
- `README.md` : ajouter mention de la progression par étapes dans la section Usage
- `DEMO-SCRIPT-v2.md` : noter que le tracker est un point de démo visuel
- `GET /api/estimates` : documenter dans la section API

### Vérification
```bash
pnpm test
pnpm typecheck
pnpm lint
```

---

> 📝 Pour les détails complets, consulte : spec.md, plan.md, tasks.md
