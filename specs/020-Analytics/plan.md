# Plan Technique — TestForge : Dashboard Analytics

> Architecture et stratégie d'implémentation — 2026-03-26

---

## Summary

Feature mixte backend + frontend. Le backend a besoin d'un endpoint agrégé avec des requêtes SQL complexes (AVG, COUNT, GROUP BY week, GROUP BY connection). Le frontend est une page neuve avec 4 sections de charts via `recharts` (nouvelle dépendance). Une migration DB mineure ajoute une colonne sur `teams`.

**Dépendance :** Le hook `useConnectionFilter` de P1 doit être disponible.

---

## Constitution Check

| Principe | Statut | Notes |
|---|---|---|
| TypeScript strict | ✅ Pass | Types stricts pour l'API response et recharts data |
| Test-first | ✅ Pass | Tests endpoint + tests composants |
| Docs MAJ | ✅ Pass | User Guide mis à jour |
| Routes API vérifiées | ✅ Pass | 1 nouveau GET + 1 nouveau PUT |
| Non-régression | ✅ Pass | Aucune route existante modifiée |
| Dépendances surveillées | ⚠️ Note | `recharts` ajoutée — vérifier la taille du bundle post-install |

---

## 1. Architecture

### Impact backend

**1 nouveau endpoint agrégé + 1 micro-endpoint config + 1 migration :**

| Endpoint | Méthode | Description |
|---|---|---|
| `GET /api/analytics/dashboard` | GET | Métriques agrégées (KPIs, distribution, weekly, by connection) |
| `PUT /api/teams/me/test-estimate` | PUT | Modifier `manual_test_minutes` (admin only) |

**1 migration :**

| Migration | Description |
|---|---|
| `add_manual_test_minutes.sql` | Ajoute `manual_test_minutes SMALLINT DEFAULT 30` sur `teams` |

### Requêtes SQL backend (Drizzle ORM)

L'endpoint `/api/analytics/dashboard` fait 4 requêtes parallèles (`Promise.all`) :

```typescript
// 1. KPIs : average score + counts
const kpis = db.select({
  averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
  totalAnalyses: count(),
}).from(analyses).where(conditions);

const genCount = db.select({ total: count() })
  .from(generations)
  .where(and(eq(generations.teamId, teamId), eq(generations.status, 'success'), ...));

// 2. Distribution : GROUP BY seuil
const distribution = db.select({
  bucket: sql<string>`CASE
    WHEN ${analyses.scoreGlobal} >= 70 THEN 'green'
    WHEN ${analyses.scoreGlobal} >= 40 THEN 'yellow'
    ELSE 'red' END`,
  count: count(),
}).from(analyses).where(conditions).groupBy(sql`1`);

// 3. Weekly : GROUP BY ISO week, 12 dernières semaines
const weekly = db.select({
  week: sql<string>`TO_CHAR(${analyses.createdAt}, 'IYYY-"W"IW')`,
  averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
  count: count(),
}).from(analyses)
  .where(and(conditions, gte(analyses.createdAt, twelveWeeksAgo)))
  .groupBy(sql`1`)
  .orderBy(sql`1`);

// 4. By connection : JOIN + GROUP BY
const byConnection = db.select({
  connectionId: sourceConnections.id,
  connectionName: sourceConnections.name,
  connectionType: sourceConnections.type,
  averageScore: sql<number>`ROUND(AVG(${analyses.scoreGlobal}))::int`,
  analysisCount: count(analyses.id),
  generationCount: count(generations.id),
}).from(analyses)
  .leftJoin(userStories, eq(analyses.userStoryId, userStories.id))
  .leftJoin(sourceConnections, eq(userStories.connectionId, sourceConnections.id))
  .leftJoin(generations, eq(generations.analysisId, analyses.id))
  .where(conditions)
  .groupBy(sourceConnections.id, sourceConnections.name, sourceConnections.type);
```

**Performance :** Ces 4 requêtes sont exécutées en parallèle. Avec index sur `team_id` et `created_at` (existants), la réponse devrait être < 500ms pour 50-100 analyses.

### Nouveaux composants frontend

| Composant | Fichier | Responsabilité |
|---|---|---|
| `AnalyticsPage` | `pages/AnalyticsPage.tsx` | Page complète : layout, fetch, filtres |
| `KpiCards` | `components/analytics/KpiCards.tsx` | 4 cards métriques en haut |
| `ScoreDistribution` | `components/analytics/ScoreDistribution.tsx` | Donut chart (recharts PieChart) |
| `ScoreEvolution` | `components/analytics/ScoreEvolution.tsx` | Line chart (recharts LineChart) |
| `ProjectBreakdown` | `components/analytics/ProjectBreakdown.tsx` | Bar chart horizontal (recharts BarChart) |
| `TimeEstimateConfig` | `components/analytics/TimeEstimateConfig.tsx` | Inline edit du temps manuel |
| `useAnalyticsData` | `hooks/useAnalyticsData.ts` | Hook : fetch + state analytics |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `apps/frontend/src/App.tsx` | Ajout route `/analytics` |
| `apps/frontend/src/components/layout/AppLayout.tsx` | Le lien "Analytics" existe déjà dans le sidebar — vérifier qu'il pointe vers `/analytics` |
| `apps/backend/src/db/schema.ts` | Ajout colonne `manualTestMinutes` sur `teams` |
| `apps/backend/src/index.ts` | Montage du nouveau router analytics |

---

## 2. Schéma de Base de Données

### Migration : `manual_test_minutes` sur `teams`

```sql
ALTER TABLE teams ADD COLUMN manual_test_minutes SMALLINT NOT NULL DEFAULT 30;
```

C'est la seule modification DB. Toutes les données analytics sont des agrégats sur les tables existantes.

---

## 3. API Design

### NOUVEAU : GET /api/analytics/dashboard

**Route :** `GET /api/analytics/dashboard?connectionId=<uuid>`

**Auth :** JWT requis

**Response 200 :**

```typescript
interface AnalyticsDashboard {
  kpis: {
    averageScore: number;       // 0-100
    totalAnalyses: number;
    totalGenerations: number;
    manualTestMinutes: number;  // config de l'équipe
    timeSavedMinutes: number;   // totalGenerations × manualTestMinutes
  };
  distribution: {
    green: number;   // score ≥ 70
    yellow: number;  // score 40-69
    red: number;     // score < 40
  };
  weeklyScores: Array<{
    week: string;         // "2026-W12"
    averageScore: number;
    count: number;
  }>;
  byConnection: Array<{
    connectionId: string | null;
    connectionName: string | null;
    connectionType: string | null;
    averageScore: number;
    analysisCount: number;
    generationCount: number;
  }>;
}
```

### NOUVEAU : PUT /api/teams/me/test-estimate

**Route :** `PUT /api/teams/me/test-estimate`

**Auth :** JWT + admin only

**Body :**
```json
{ "manualTestMinutes": 45 }
```

**Validation Zod :** `z.object({ manualTestMinutes: z.number().int().min(5).max(240) })`

**Response 200 :**
```json
{ "manualTestMinutes": 45 }
```

---

## 4. Stratégie de Test

### Tests Backend (Vitest)

#### Endpoint `GET /api/analytics/dashboard`

| Test | Description |
|---|---|
| `should return all 4 sections (kpis, distribution, weeklyScores, byConnection)` | Structure complète |
| `should calculate correct average score` | Moyenne arithmétique des scoreGlobal |
| `should categorize scores into green/yellow/red buckets` | Seuils 70/40 |
| `should return weekly scores for last 12 weeks only` | Pas de données plus anciennes |
| `should filter by connectionId when provided` | Param optionnel |
| `should only return data for the authenticated team` | Isolation multi-tenant |
| `should return zeros when no analyses exist` | Nouveau compte |
| `should calculate timeSavedMinutes from team config` | manualTestMinutes × generations |

#### Endpoint `PUT /api/teams/me/test-estimate`

| Test | Description |
|---|---|
| `should update manualTestMinutes for the team` | Happy path |
| `should reject values < 5 or > 240` | Validation Zod |
| `should require admin role` | 403 pour member |

### Tests Frontend (Vitest + React Testing Library)

#### Hook `useAnalyticsData`

| Test | Description |
|---|---|
| `should fetch from /api/analytics/dashboard` | Mock API |
| `should pass connectionId to API when provided` | Param forwarding |
| `should handle empty data (new account)` | Zeros everywhere |

#### Composant `KpiCards`

| Test | Description |
|---|---|
| `should render 4 cards with correct values` | Props → texte |
| `should format time saved as hours and minutes` | 1050 min → "17h 30min" |
| `should show correct color for average score` | ≥70 green, 40-69 yellow, <40 red |

#### Composant `ScoreDistribution`

| Test | Description |
|---|---|
| `should render donut with 3 segments` | green, yellow, red |
| `should show center label with average score` | Score au centre |

#### Composant `ScoreEvolution`

| Test | Description |
|---|---|
| `should render line chart with weekly data points` | Nombre de points = nombre de semaines |
| `should handle empty weeks (no data points)` | Pas de crash |

#### Composant `ProjectBreakdown`

| Test | Description |
|---|---|
| `should render one bar per connection` | Nombre de barres = nombre de connexions |
| `should sort by average score descending` | Meilleur score en premier |

### Couverture cible

| Type | Cible |
|---|---|
| Unit backend | 11 tests (8 dashboard + 3 config) |
| Unit frontend | 10 tests (hook + 4 composants) |
| Non-régression | Aucune route existante modifiée |

---

## 5. Nouvelle dépendance : recharts

```bash
pnpm --filter @testforge/frontend add recharts
```

**Justification :** recharts est la lib de charts la plus utilisée en React, 100% composants déclaratifs, tree-shakable, 0 config. Alternatives évaluées : Chart.js (impératif, moins React-natif), D3 (overkill), Nivo (plus lourd). recharts est le meilleur compromis pour 4 types de charts simples.

**Impact bundle :** ~45KB gzippé (seulement les composants importés grâce au tree-shaking). Le build Vite actuel est ~120KB gzippé — l'ajout est acceptable.

---

## 6. Fichiers impactés — Cartographie

### Nouveaux fichiers (backend)

```
apps/backend/src/
├── routes/
│   ├── analytics.ts                              # Routes analytics
│   └── __tests__/
│       └── analytics.test.ts                     # 11 tests
├── db/migrations/
│   └── XXXX_add_manual_test_minutes.sql          # Migration
```

### Nouveaux fichiers (frontend)

```
apps/frontend/src/
├── pages/
│   └── AnalyticsPage.tsx                         # Page complète
├── components/analytics/
│   ├── KpiCards.tsx                               # 4 cards
│   ├── KpiCards.test.tsx
│   ├── ScoreDistribution.tsx                     # Donut chart
│   ├── ScoreDistribution.test.tsx
│   ├── ScoreEvolution.tsx                        # Line chart
│   ├── ScoreEvolution.test.tsx
│   ├── ProjectBreakdown.tsx                      # Bar chart
│   ├── ProjectBreakdown.test.tsx
│   ├── TimeEstimateConfig.tsx                    # Inline config
│   └── TimeEstimateConfig.test.tsx
├── hooks/
│   ├── useAnalyticsData.ts                       # Fetch hook
│   └── useAnalyticsData.test.ts
```

### Fichiers modifiés

```
apps/frontend/src/App.tsx                         # Route /analytics
apps/frontend/src/components/layout/AppLayout.tsx  # Vérifier lien sidebar
apps/backend/src/db/schema.ts                      # Colonne manualTestMinutes
apps/backend/src/index.ts                          # Montage router analytics
```

---

## 7. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Requêtes agrégées lentes sur gros volumes | Faible | Index existants + limit 12 semaines + Promise.all |
| Le lien "Analytics" dans le sidebar ne pointe pas vers `/analytics` | Faible | Vérifier `AppLayout.tsx` ; le screenshot montre le lien |
| recharts augmente la taille du bundle | Faible | Tree-shaking Vite + import sélectif |
| Le `generationCount` dans `byConnection` double-compte si 2 générations par analyse | Moyen | Utiliser `COUNT(DISTINCT generations.id)` |
| Le filtre `connectionId` sur les weekly scores nécessite un join | Faible | Join analyses → userStories si connectionId fourni |

---

> 📎 **Dépendance spec.md :** Voir spec.md pour les user stories et critères d'acceptation.
> 📎 **Dépendance P1 :** Hook `useConnectionFilter`.
