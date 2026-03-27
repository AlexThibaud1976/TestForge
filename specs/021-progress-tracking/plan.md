# Plan Technique — 008 Progress Tracking

> Architecture et stratégie d'implémentation — 27 mars 2026
> Spec : specs/008-progress-tracking/spec.md

---

## 1. Résumé

Transformer l'analyse qualité d'un flux synchrone (requête HTTP bloquante) en flux asynchrone (comme la génération), ajouter des étapes de progression intermédiaires émises via Supabase Realtime, et créer un composant frontend `ProgressTracker` réutilisable affichant l'étape en cours + temps écoulé vs estimé. Ajouter un endpoint d'estimation basé sur les durées historiques.

---

## 2. Contexte Technique

**Stack existante (pas de changement) :**

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui |
| Backend | Node.js 20 + Express + TypeScript |
| DB/Realtime | Supabase (PostgreSQL + Realtime) |
| ORM | Drizzle ORM |
| Tests | Vitest |

**Patterns réutilisés :**
- `useRealtimeRow` hook (existant) — souscription aux changements d'une ligne
- Pattern async `createPending → processInBackground → Realtime notify` (déjà en place pour les générations)

---

## 3. Schéma de Base de Données — Modifications

### Migration 1 : `analyses` — nouvelles colonnes

```sql
ALTER TABLE analyses
  ADD COLUMN status TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN progress_step TEXT,
  ADD COLUMN duration_ms INTEGER;

-- Toutes les analyses existantes sont des succès (flux synchrone terminé)
-- Le DEFAULT 'success' gère ça automatiquement
```

**Justification du default `'success'` :** Les analyses existantes n'ont pas de statut car elles étaient synchrones. Elles sont toutes terminées avec succès (sinon elles n'auraient pas été insérées). Le default `'success'` garantit la rétrocompatibilité sans data migration.

### Migration 2 : `generations` — nouvelle colonne

```sql
ALTER TABLE generations
  ADD COLUMN progress_step TEXT;

-- status et duration_ms existent déjà
```

### Drizzle Schema — Modifications

```typescript
// Dans apps/backend/src/db/schema.ts

// Table analyses — ajouter :
status: text('status').notNull().default('success'),
progressStep: text('progress_step'),
durationMs: integer('duration_ms'),

// Table generations — ajouter :
progressStep: text('progress_step'),
```

---

## 4. API Design

### Modifications de routes existantes

#### `POST /api/analyses` — Changement de comportement

**Avant :** Synchrone — attend le résultat LLM et retourne l'analyse complète.

**Après :**
1. Vérifie le cache (identique à aujourd'hui)
2. Si cache hit → retourne `201` avec l'analyse complète et `status: 'success'` (pas de changement côté frontend dans ce cas)
3. Si cache miss → crée un record `pending`, retourne **`202 Accepted`** avec `{ id, status: 'pending', analysisId: null }` et lance le traitement en background

**Détail important :** Le code HTTP change de `201` à `202` pour le cas async, ce qui permet au frontend de distinguer les deux cas :
- `201` → cache hit, résultat complet dans la réponse
- `202` → async, souscrire au Realtime

#### `GET /api/analyses/:id` — Pas de changement

Retourne l'analyse avec les nouvelles colonnes `status`, `progressStep`, `durationMs`.

#### `GET /api/analyses?userStoryId=...` — Ajustement mineur

Filtrer les analyses avec `status = 'success'` uniquement (ignorer les `pending`/`error` pour la requête de chargement initial).

### Nouvelle route

#### `GET /api/estimates`

| Param | Type | Description |
|-------|------|-------------|
| `type` | query, required | `'analysis'` ou `'generation'` |
| `provider` | query, required | ex: `'openai'` |
| `model` | query, required | ex: `'gpt-4o'` |

**Réponse :**

```json
{
  "estimatedMs": 14500,
  "sampleSize": 18,
  "source": "team"
}
```

**Logique de calcul :**
1. Récupérer les 20 dernières opérations réussies (`status = 'success'`, `duration_ms IS NOT NULL`) pour ce `provider + model + teamId`
2. Si `count >= 5` → médiane → `source: 'team'`
3. Sinon, récupérer les 20 dernières globales (tous `teamId`) → si `count >= 5` → médiane → `source: 'global'`
4. Sinon → fallback hardcodé → `source: 'default'`

**Fallbacks hardcodés :**

| Type | Défaut |
|------|--------|
| analysis | 15000 ms |
| generation | 25000 ms |

---

## 5. Architecture Backend

### Refactor AnalysisService

Le service passe de 1 méthode (`analyze`) à 3 méthodes (pattern identique à `GenerationService`) :

```typescript
class AnalysisService {
  // Existant — renommé et adapté
  async analyzeWithCache(userStoryId: string, teamId: string): Promise<AnalysisResult | null>
  // Retourne l'analyse en cache si valide, sinon null

  // Nouveau — crée le record pending
  async createPending(userStoryId: string, teamId: string): Promise<{ id: string; status: string }>

  // Nouveau — traitement background (appelé fire-and-forget)
  async processAnalysis(analysisId: string, userStoryId: string, teamId: string): Promise<void>

  // Existant — inchangé
  private parseResponse(raw: unknown): LLMAnalysisResponse
  private toResult(row: typeof analyses.$inferSelect): AnalysisResult
}
```

**Séquence `processAnalysis` :**

```
1. UPDATE analyses SET progress_step = 'preparing'
   → Valider la US, récupérer la config LLM, construire le prompt

2. UPDATE analyses SET progress_step = 'calling_llm'
   → Appeler le LLM (la partie longue ~80% du temps)

3. UPDATE analyses SET progress_step = 'finalizing'
   → Parser la réponse, calculer les scores

4. UPDATE analyses SET status = 'success', progress_step = NULL,
   duration_ms = ..., score_global = ..., (tous les champs de résultat)
```

Chaque UPDATE déclenche automatiquement un événement Supabase Realtime.

### Adaptation GenerationService

Ajouter les mêmes updates `progress_step` dans `processGeneration` :

```
1. Avant la récupération de l'analyse/US/config : progress_step = 'preparing'
2. Avant l'appel LLM : progress_step = 'calling_llm'
3. Après le retour LLM, avant le parsing/sauvegarde : progress_step = 'finalizing'
4. À la fin : progress_step = NULL (déjà status = 'success')
```

### Rétrocompatibilité Batch Analysis (005)

Le batch analysis utilise `AnalysisService.analyze()`. Deux options :

**Option retenue :** Conserver une méthode `analyze()` publique qui encapsule le nouveau flux mais de façon synchrone (await le résultat). Ainsi le batch n'a pas besoin de changement :

```typescript
async analyze(userStoryId: string, teamId: string): Promise<AnalysisResult> {
  // 1. Check cache
  const cached = await this.analyzeWithCache(userStoryId, teamId);
  if (cached) return cached;

  // 2. Create pending + process synchronously (for batch compat)
  const pending = await this.createPending(userStoryId, teamId);
  await this.processAnalysis(pending.id, userStoryId, teamId);

  // 3. Return completed analysis
  const result = await this.getById(pending.id, teamId);
  if (!result) throw new Error('Analysis processing failed');
  return result;
}
```

Le frontend **ne** passe **pas** par cette méthode — la route `POST /api/analyses` utilise `createPending` + fire-and-forget `processAnalysis`.

---

## 6. Architecture Frontend

### Nouveau composant : `ProgressTracker`

**Emplacement :** `apps/frontend/src/components/progress/ProgressTracker.tsx`

**Props :**

```typescript
interface ProgressStep {
  key: string;       // 'preparing' | 'calling_llm' | 'finalizing'
  label: string;     // "Préparation" | "Appel LLM" | "Résultat"
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep: string | null;        // progress_step actuel depuis Realtime
  status: 'pending' | 'processing' | 'success' | 'error';
  estimatedMs: number;               // depuis GET /api/estimates
  startedAt: number;                 // timestamp ms du démarrage
  errorMessage?: string;
}
```

**Logique interne :**
- `useEffect` avec `setInterval(1000)` pour le compteur de temps écoulé
- Calcul du ratio `elapsed / estimatedMs` pour la barre (capped à 95%)
- Messages adaptatifs basés sur les seuils (1.5x, 3x)

### Modification de StoryDetailPage

**Analyse :**
1. `handleAnalyze` appelle `POST /api/analyses`
2. Si réponse `201` → afficher le résultat directement (cache hit)
3. Si réponse `202` → passer en état `'loading'`, récupérer l'estimation, afficher `ProgressTracker`, souscrire via `useRealtimeRow`
4. À chaque update Realtime : mettre à jour `currentStep` dans le tracker
5. Quand `status === 'success'` → récupérer l'analyse complète via `GET /api/analyses/:id`

**Génération :**
1. `handleGenerate` (existant) crée le pending
2. Ajouter la récupération de l'estimation avant d'afficher le tracker
3. Remplacer le spinner par `ProgressTracker`
4. Le hook `useRealtimeRow` existant est réutilisé

### Appel de l'estimation

```typescript
// Avant de lancer l'opération, récupérer l'estimation
const estimate = await api.get<DurationEstimate>(
  `/api/estimates?type=analysis&provider=${llmConfig.provider}&model=${llmConfig.model}`
);
```

**Question :** Le frontend doit connaître le provider/model actif. Cette info est disponible via `GET /api/llm-configs` (déjà chargé dans les settings). Il faudra soit :
- Stocker le provider/model default dans un contexte React (simple)
- Ou passer des valeurs par défaut et laisser le backend déterminer (plus découplé)

**Choix retenu :** Le endpoint `GET /api/estimates` accepte optionnellement `provider` et `model`. S'ils sont absents, le backend utilise la config LLM par défaut de l'équipe. Plus découplé.

---

## 7. Stratégie de Test

### Tests Unitaires (Vitest)

**AnalysisService :**
- `analyzeWithCache` — cache hit, cache miss, cache invalidé par fetchedAt
- `createPending` — vérifie le record en DB avec `status: 'pending'`
- `processAnalysis` — vérifie la séquence d'updates (`progress_step`), le calcul de `duration_ms`, la gestion d'erreur (status = 'error')
- `analyze` (compat batch) — vérifie que le flux synchrone fonctionne toujours

**GenerationService :**
- `processGeneration` — vérifie les updates `progress_step` (3 transitions)

**EstimateService :**
- Médiane par team (5+ samples)
- Fallback global (< 5 team samples)
- Fallback hardcodé (< 5 global samples)
- Edge case : toutes les durées identiques

**ProgressTracker (composant) :**
- Rendu des 3 états (pending, active, done) pour chaque étape
- Affichage du temps écoulé formaté
- Message de dépassement
- État erreur

### Tests d'Intégration

- `POST /api/analyses` — vérifier `201` (cache hit) vs `202` (async)
- `GET /api/estimates` — avec et sans paramètres provider/model
- Non-régression : `POST /api/analyses/batch` continue de fonctionner

### Couverture cible

| Type | Cible |
|------|-------|
| Unit (AnalysisService refactor) | > 90% |
| Unit (EstimateService) | > 90% |
| Unit (ProgressTracker) | > 80% |
| Intégration (routes modifiées) | 3 routes couvertes |

---

## 8. Points de Vigilance — Régressions

| Composant | Risque | Mitigation |
|-----------|--------|------------|
| Batch analysis (005) | Appelle `AnalysisService.analyze()` | Conserver la méthode `analyze()` comme wrapper synchrone |
| `GET /api/analyses?userStoryId=` | Pourrait retourner des analyses `pending` | Filtrer `status = 'success'` |
| StoryDetailPage — chargement initial | Utilise `GET /api/analyses?userStoryId=` | Pas de changement sur cette route |
| Analyses existantes sans `status` | Colonne manquante | Migration avec `DEFAULT 'success'` |
| Frontend — distinction cache hit vs async | Même route, comportement différent | Code HTTP `201` vs `202` |
| Tests existants `AnalysisService.test.ts` | Testent le flux synchrone | Réécrire pour couvrir les 3 nouvelles méthodes |
| Supabase Realtime | Latence possible | Fallback polling toutes les 3s en cas d'échec de souscription |
| Analyses `error` orphelines | Si le background crash sans update | Ajouter un timeout côté frontend (90s) pour détecter les analyses bloquées |

---

## 9. Structure des Fichiers

### Nouveaux fichiers

```
apps/backend/src/
  services/
    estimates/
      EstimateService.ts          # Calcul des médianes historiques
      EstimateService.test.ts
  routes/
    estimates.ts                  # GET /api/estimates

apps/frontend/src/
  components/
    progress/
      ProgressTracker.tsx         # Composant réutilisable
      ProgressTracker.test.tsx
```

### Fichiers modifiés

```
apps/backend/src/
  db/schema.ts                   # Nouvelles colonnes analyses + generations
  services/analysis/
    AnalysisService.ts            # Refactor async (3 méthodes)
    AnalysisService.test.ts       # Réécriture des tests
  services/generation/
    GenerationService.ts          # Ajout progress_step updates
  routes/
    analyses.ts                   # 201/202 + filtre status
    index.ts                      # Montage route estimates

apps/frontend/src/
  pages/
    StoryDetailPage.tsx           # Intégration ProgressTracker
```

### Migrations Drizzle

```
apps/backend/drizzle/
  XXXX_add_analysis_async_columns.sql
  XXXX_add_generation_progress_step.sql
```
