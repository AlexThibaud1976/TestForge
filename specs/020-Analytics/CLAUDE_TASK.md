# 🚀 Claude Code — Dashboard Analytics

> ```bash
> claude < specs/004-analytics-dashboard/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge est un SaaS B2B multi-tenant (React + Vite, Node.js + Express, Supabase PostgreSQL). La page Analytics (`/analytics`) n'existe pas encore mais le lien est dans le sidebar. Il faut créer un dashboard avec 4 sections : KPI cards, distribution des scores, évolution hebdomadaire, répartition par projet. Plus un paramètre configurable "temps moyen par test" pour calculer le ROI.

**État actuel du code :**

- `apps/frontend/src/components/layout/AppLayout.tsx` : le sidebar a un lien "Analytics" avec icône `📊` qui pointe vers `/analytics` — mais la route et la page n'existent pas
- `apps/frontend/src/App.tsx` : pas de route `/analytics` dans `ProtectedRoutes`
- `apps/backend/src/db/schema.ts` : la table `teams` n'a pas de colonne `manual_test_minutes`
- Les tables `analyses` (avec `scoreGlobal`, `scoreClarity`, etc.) et `generations` (avec `status`, `durationMs`) contiennent toutes les données nécessaires
- Le hook `useConnectionFilter` existe (feature P1) et doit être réutilisé pour le filtre par projet
- **Aucune lib de charts** n'est installée — il faut ajouter `recharts`

**Relations DB pour les agrégats :**
```
analyses.teamId → teams.id
analyses.userStoryId → userStories.id → userStories.connectionId → sourceConnections.id
generations.analysisId → analyses.id
generations.teamId → teams.id
```

---

## Règles de code (NON-NÉGOCIABLES)

1. **TypeScript strict** — aucun `any`, aucun `@ts-ignore`
2. **Test-first** — tests RED avant implémentation GREEN
3. **Pas de régression** — aucune route existante modifiée
4. **Conventions** — imports `.js`, Tailwind CSS, `api` de `../lib/api.js`
5. **Nouvelle dépendance** — `recharts` uniquement, installée via `pnpm --filter @testforge/frontend add recharts`
6. **Palette cohérente** — vert (#22C55E) pour score ≥70, jaune (#EAB308) pour 40-69, rouge (#EF4444) pour <40

---

## TÂCHE 1 — Setup : migration + dépendance

### Objectif
Ajouter la colonne `manual_test_minutes` et installer recharts.

### Étapes

```bash
# 1. Installer recharts
pnpm --filter @testforge/frontend add recharts

# 2. Créer la migration
```

Migration `apps/backend/src/db/migrations/XXXX_add_manual_test_minutes.sql` :
```sql
ALTER TABLE teams ADD COLUMN manual_test_minutes SMALLINT NOT NULL DEFAULT 30;
```

Ajouter dans `apps/backend/src/db/schema.ts`, table `teams` :
```typescript
manualTestMinutes: smallint('manual_test_minutes').notNull().default(30),
```

```bash
# 3. Appliquer la migration
cd apps/backend && pnpm db:migrate

# 4. Vérifier
pnpm typecheck && pnpm build
```

---

## TÂCHE 2 — Backend : endpoints analytics (test-first)

### Fichiers à créer
- `apps/backend/src/routes/__tests__/analytics.test.ts` (ÉCRIRE EN PREMIER)
- `apps/backend/src/routes/analytics.ts`

### Route `GET /api/analytics/dashboard`

L'endpoint fait 4 requêtes en parallèle :

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { eq, and, gte, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { analyses, generations, userStories, sourceConnections, teams } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

// GET /api/analytics/dashboard?connectionId=<uuid>
router.get('/dashboard', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const connectionId = req.query['connectionId'] as string | undefined;

  // Conditions de base pour les analyses
  const baseConditions = [eq(analyses.teamId, teamId)];

  // Si connectionId, on doit joindre analyses → userStories pour filtrer
  // Construire une sous-requête ou un join conditionnel

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 semaines

  // Charger le team config
  const [team] = await db.select({ manualTestMinutes: teams.manualTestMinutes })
    .from(teams).where(eq(teams.id, teamId)).limit(1);
  const manualTestMinutes = team?.manualTestMinutes ?? 30;

  // Si connectionId fourni, on filtre via un join sur userStories
  // Sinon, on filtre directement sur analyses.teamId

  // 4 requêtes en parallèle — adapter avec/sans join connectionId
  const [kpiResult, distResult, weeklyResult, byConnResult, genCountResult] = await Promise.all([
    // 1. KPIs : average score + total analyses
    // SQL: SELECT ROUND(AVG(score_global))::int, COUNT(*) FROM analyses WHERE team_id = ? [AND ...]
    
    // 2. Distribution : GROUP BY bucket
    // SQL: SELECT CASE WHEN score >= 70 THEN 'green' ... END, COUNT(*) GROUP BY 1
    
    // 3. Weekly : GROUP BY ISO week, last 12 weeks
    // SQL: SELECT TO_CHAR(created_at, 'IYYY-"W"IW'), ROUND(AVG(score_global)), COUNT(*) GROUP BY 1 ORDER BY 1
    
    // 4. By connection : JOIN analyses → userStories → sourceConnections, GROUP BY connection
    // SQL: SELECT conn.id, conn.name, conn.type, ROUND(AVG(score)), COUNT(DISTINCT a.id), COUNT(DISTINCT g.id)
    
    // 5. Generation count (success only)
    // SQL: SELECT COUNT(*) FROM generations WHERE team_id = ? AND status = 'success' [AND ...]
  ]);

  res.json({
    kpis: {
      averageScore: kpiResult.averageScore ?? 0,
      totalAnalyses: kpiResult.totalAnalyses ?? 0,
      totalGenerations: genCountResult.total ?? 0,
      manualTestMinutes,
      timeSavedMinutes: (genCountResult.total ?? 0) * manualTestMinutes,
    },
    distribution: {
      green: distResult.green ?? 0,
      yellow: distResult.yellow ?? 0,
      red: distResult.red ?? 0,
    },
    weeklyScores: weeklyResult,
    byConnection: byConnResult,
  });
});

// PUT /api/teams/me/test-estimate
router.put('/test-estimate', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    manualTestMinutes: z.number().int().min(5).max(240),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  await db.update(teams)
    .set({ manualTestMinutes: parsed.data.manualTestMinutes })
    .where(eq(teams.id, teamId));

  res.json({ manualTestMinutes: parsed.data.manualTestMinutes });
});

export default router;
```

**⚠️ Le filtre `connectionId` est le cas le plus délicat.** Quand il est fourni, les requêtes KPI, distribution et weekly doivent joindre `analyses → userStories` pour filtrer par `userStories.connectionId`. Quand il est absent, les requêtes sont plus simples (juste `analyses.teamId`). Implémenter les deux chemins proprement.

**⚠️ Pour `byConnection`, utiliser `COUNT(DISTINCT ...)` :**
```typescript
analysisCount: sql<number>`COUNT(DISTINCT ${analyses.id})::int`,
generationCount: sql<number>`COUNT(DISTINCT ${generations.id})::int`,
```
Sans DISTINCT, les joins multiples produisent des doublons.

### Montage du router

Dans `apps/backend/src/index.ts` :
```typescript
import analyticsRouter from './routes/analytics.js';
// ...
app.use('/api/analytics', analyticsRouter);
```

### Vérification
```bash
cd apps/backend && pnpm test -- --grep "analytics"
```

---

## TÂCHE 3 — Hook `useAnalyticsData` (test-first)

### Fichiers à créer
- `apps/frontend/src/hooks/useAnalyticsData.test.ts` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/hooks/useAnalyticsData.ts`

### Interface de retour

```typescript
interface AnalyticsDashboard {
  kpis: {
    averageScore: number;
    totalAnalyses: number;
    totalGenerations: number;
    manualTestMinutes: number;
    timeSavedMinutes: number;
  };
  distribution: { green: number; yellow: number; red: number };
  weeklyScores: Array<{ week: string; averageScore: number; count: number }>;
  byConnection: Array<{
    connectionId: string | null;
    connectionName: string | null;
    connectionType: string | null;
    averageScore: number;
    analysisCount: number;
    generationCount: number;
  }>;
}

interface UseAnalyticsReturn {
  data: AnalyticsDashboard | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAnalyticsData(connectionId: string | null): UseAnalyticsReturn {
  // Fetch GET /api/analytics/dashboard?connectionId=xxx
  // Re-fetch quand connectionId change
}
```

---

## TÂCHE 4 — Composants Charts (test-first)

### `KpiCards.tsx`

```tsx
interface KpiCardsProps {
  averageScore: number;
  totalAnalyses: number;
  totalGenerations: number;
  timeSavedMinutes: number;
  manualTestMinutes: number;
  onEditEstimate: () => void;
}

// 4 cards en grid 4 colonnes
// Score moyen : badge couleur (vert ≥70, jaune 40-69, rouge <40)
// Temps économisé : formaté "Xh Ymin" + label "(Z min/test)" + bouton ⚙️
```

### `ScoreDistribution.tsx`

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Donut chart avec innerRadius=60, outerRadius=80
// 3 cells : green (#22C55E), yellow (#EAB308), red (#EF4444)
// Label central custom : score moyen en gros + "/100"
// Légende en bas : "🟢 22 (46%) · 🟡 18 (37%) · 🔴 8 (17%)"
```

### `ScoreEvolution.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Données : weeklyScores.map(w => ({ name: w.week.replace('W', 'S'), score: w.averageScore }))
// YAxis domain [0, 100]
// Line stroke="#3B82F6" (blue-500), strokeWidth=2, type="monotone"
// Tooltip custom : "Semaine S12 : 67/100 (8 analyses)"
```

### `ProjectBreakdown.tsx`

```tsx
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';

// Layout vertical (barres horizontales)
// Données triées par averageScore desc
// Couleur par barre : vert/jaune/rouge selon seuil
// YAxis = noms des connexions (avec icône 🔵/🟣 dans le label)
// Annotations à droite : "20 analyses · 15 tests"
```

### `TimeEstimateConfig.tsx`

```tsx
// Mode lecture : texte "(30 min/test)" + icône ⚙️
// Mode édition : input[type=number] min=5 max=240 + Sauver + Annuler
// Au save : PUT /api/teams/me/test-estimate → callback parent pour refetch
```

---

## TÂCHE 5 — Page `AnalyticsPage.tsx` + route

### Fichier à créer
- `apps/frontend/src/pages/AnalyticsPage.tsx`

### Structure

```tsx
import { useState } from 'react';
import { useConnectionFilter } from '../hooks/useConnectionFilter.js';
import { useAnalyticsData } from '../hooks/useAnalyticsData.js';
import { KpiCards } from '../components/analytics/KpiCards.js';
import { ScoreDistribution } from '../components/analytics/ScoreDistribution.js';
import { ScoreEvolution } from '../components/analytics/ScoreEvolution.js';
import { ProjectBreakdown } from '../components/analytics/ProjectBreakdown.js';
import { TimeEstimateConfig } from '../components/analytics/TimeEstimateConfig.js';

export function AnalyticsPage() {
  const { connections, connectionId, setConnectionId } = useConnectionFilter();
  const { data, loading, refetch } = useAnalyticsData(connectionId);
  const [editingEstimate, setEditingEstimate] = useState(false);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header + filtre */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        {connections.length > 0 && (
          <select value={connectionId ?? ''} onChange={...} className="...">
            <option value="">Tous les projets</option>
            {connections.map(c => (
              <option key={c.id} value={c.id}>{c.type === 'jira' ? '🔵' : '🟣'} {c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      {data && <KpiCards {...data.kpis} onEditEstimate={() => setEditingEstimate(true)} />}
      
      {/* TimeEstimateConfig (inline, conditionnel) */}
      {editingEstimate && (
        <TimeEstimateConfig
          currentValue={data?.kpis.manualTestMinutes ?? 30}
          onSave={() => { setEditingEstimate(false); refetch(); }}
          onCancel={() => setEditingEstimate(false)}
        />
      )}

      {/* Charts row : Distribution (gauche) + Evolution (droite) */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {data && <ScoreDistribution distribution={data.distribution} averageScore={data.kpis.averageScore} />}
        {data && <ScoreEvolution weeklyScores={data.weeklyScores} />}
      </div>

      {/* Project breakdown (full width) */}
      {data && <ProjectBreakdown connections={data.byConnection} />}
    </div>
  );
}
```

### Route à ajouter dans `App.tsx`

```tsx
import { AnalyticsPage } from './pages/AnalyticsPage.js';

// Dans ProtectedRoutes :
<Route path="/analytics" element={<AnalyticsPage />} />
```

### Vérifier le sidebar

Ouvrir `apps/frontend/src/components/layout/AppLayout.tsx` et vérifier que l'item "Analytics" dans `navSections` a `to: '/analytics'`. Le screenshot montre qu'il existe avec l'icône `📊`. S'il manque, l'ajouter.

---

## TÂCHE 6 — Documentation + vérification finale

### User Guide
Ajouter section "Analytics" dans `docs/user-guide.md` :
- Description des 4 sections du dashboard
- Comment configurer le temps estimé par test
- Comment filtrer par projet

### Checklist

```bash
pnpm typecheck                    # 0 erreur
pnpm lint                         # 0 warning
pnpm test                         # Tous passent
pnpm --filter @testforge/frontend build  # Vérifier taille bundle — noter l'impact recharts
grep -r "any" apps/frontend/src/components/analytics/ apps/frontend/src/hooks/useAnalyticsData.ts  # 0
grep -r "console.log" apps/frontend/src/components/analytics/  # 0
```

---

## Récapitulatif des fichiers

### À créer (14 fichiers)

```
apps/backend/src/db/migrations/XXXX_add_manual_test_minutes.sql
apps/backend/src/routes/analytics.ts
apps/backend/src/routes/__tests__/analytics.test.ts

apps/frontend/src/pages/AnalyticsPage.tsx
apps/frontend/src/hooks/useAnalyticsData.ts
apps/frontend/src/hooks/useAnalyticsData.test.ts
apps/frontend/src/components/analytics/KpiCards.tsx
apps/frontend/src/components/analytics/KpiCards.test.tsx
apps/frontend/src/components/analytics/ScoreDistribution.tsx
apps/frontend/src/components/analytics/ScoreDistribution.test.tsx
apps/frontend/src/components/analytics/ScoreEvolution.tsx
apps/frontend/src/components/analytics/ScoreEvolution.test.tsx
apps/frontend/src/components/analytics/ProjectBreakdown.tsx
apps/frontend/src/components/analytics/ProjectBreakdown.test.tsx
apps/frontend/src/components/analytics/TimeEstimateConfig.tsx
apps/frontend/src/components/analytics/TimeEstimateConfig.test.tsx
```

### À modifier (4 fichiers)

```
apps/backend/src/db/schema.ts          — colonne manualTestMinutes sur teams
apps/backend/src/index.ts              — montage router analytics
apps/frontend/src/App.tsx              — route /analytics
apps/frontend/src/components/layout/AppLayout.tsx — vérifier lien sidebar
```

---

> 📝 Specs : `specs/004-analytics-dashboard/spec.md`, `plan.md`, `tasks.md`
> ⚠️ Prérequis : feature 002-p1-project-filter (hook `useConnectionFilter`)
