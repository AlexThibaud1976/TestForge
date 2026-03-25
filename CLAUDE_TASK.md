# CLAUDE_TASK — 006-analytics-roi

> Dashboard analytics et ROI — métriques d'utilisation, temps gagné, tendances de score.
> Usage : `claude < CLAUDE_TASK.md`

---

## Contexte

TestForge — monorepo pnpm. Voir `CLAUDE.md` à la racine.
**Spec + Plan + Tasks** : `specs/006-analytics-roi/spec.md` (contient tout)

## Règles

- TypeScript strict, aucun `any`
- Pas de table analytics dédiée — agrégats SQL sur tables existantes (analyses, generations, manual_test_sets)
- Graphiques via Recharts (déjà disponible dans les deps frontend)
- Conventional Commits

---

## PHASE 1 — Endpoint Analytics (~4h)

### 1.1 — AnalyticsService

Créer `apps/backend/src/services/analytics/AnalyticsService.ts` :

```typescript
interface AnalyticsMetrics {
  period: { from: string; to: string };
  counts: { analyses: number; generations: number; manualTestSets: number; manualTestCases: number };
  timeSaved: { totalMinutes: number; breakdown: { analyses: number; generations: number; manualTests: number }; coefficients: { analysis: number; generation: number; manualTest: number } };
  scoreTrend: Array<{ week: string; meanScore: number; count: number }>;
  distribution: { frameworks: Record<string, number>; llmProviders: Record<string, number> };
  highlights: { bestScoredUS: { id: string; title: string; score: number } | null; worstScoredUS: { id: string; title: string; score: number } | null; scoreTrendPercent: number | null };
}
```

Méthode : `getMetrics(teamId: string, period: 'month' | 'quarter' | 'all'): Promise<AnalyticsMetrics>`

Requêtes SQL (Drizzle) :

**Counts** :
```typescript
const analysisCount = await db.select({ count: count() }).from(analyses)
  .where(and(eq(analyses.teamId, teamId), gte(analyses.createdAt, periodStart)));
```

**Score trend** :
```typescript
// GROUP BY date_trunc('week', created_at), AVG(score_global)
const trend = await db.execute(sql`
  SELECT date_trunc('week', created_at) as week, 
         AVG(score_global)::int as mean_score, 
         COUNT(*)::int as count
  FROM analyses 
  WHERE team_id = ${teamId} AND created_at >= ${periodStart}
  GROUP BY week ORDER BY week
`);
```

**Distribution** :
```typescript
const frameworks = await db.select({ 
  key: sql`framework || '+' || language`, 
  count: count() 
}).from(generations)
  .where(and(eq(generations.teamId, teamId), gte(generations.createdAt, periodStart)))
  .groupBy(sql`framework || '+' || language`);
```

**Coefficients de temps** : charger depuis `teams.analytics_coefficients` (jsonb). Si null, utiliser les défauts : `{ analysis: 30, generation: 90, manualTest: 45 }` (minutes).

**Highlights** : best/worst = SELECT avec ORDER BY score_global DESC/ASC LIMIT 1. Trend percent = comparer le score moyen de cette période vs la période précédente.

### 1.2 — Migration

```sql
ALTER TABLE teams ADD COLUMN analytics_coefficients JSONB DEFAULT NULL;
```

Ajouter la colonne dans le schéma Drizzle sur la table `teams`.

### 1.3 — Route

Créer `apps/backend/src/routes/analytics.ts` :

```typescript
// GET /api/analytics?period=month|quarter|all
router.get('/', requireAuth, async (req, res) => {
  const period = z.enum(['month', 'quarter', 'all']).default('month').parse(req.query.period);
  const metrics = await analyticsService.getMetrics(teamId, period);
  res.json(metrics);
});

// PATCH /api/teams/me/analytics-config
// Body: { analysisMinutes: number, generationMinutes: number, manualTestMinutes: number }
```

Enregistrer dans `apps/backend/src/index.ts`.

### 1.4 — Tests

Fichier : `apps/backend/src/services/analytics/AnalyticsService.test.ts`

Mocker la DB avec des données d'analyse/génération connues. Vérifier :
- Counts corrects
- meanScore correctement calculé
- Distribution correcte
- Temps gagné = counts × coefficients
- Période "month" filtre bien les données

---

## PHASE 2 — Frontend Dashboard (~8h)

### 2.1 — AnalyticsPage

Créer `apps/frontend/src/pages/AnalyticsPage.tsx`.

Layout :
```
┌──────────────────────────────────────────┐
│  [Ce mois ▼]                             │
├──────────┬──────────┬──────────┬─────────┤
│ 42       │ 18       │ 12       │ ~40h    │
│ Analyses │ Générat. │ Tests    │ Gagnées │
│          │          │ manuels  │         │
├──────────┴──────────┴──────────┴─────────┤
│                                          │
│  Score moyen par semaine (line chart)    │
│  ────────────────────────────────        │
│                                          │
├────────────────────┬─────────────────────┤
│ Frameworks (donut) │ Providers (donut)   │
├────────────────────┴─────────────────────┤
│ Points clés                              │
│ ✓ Score en hausse de +12%                │
│ ⚠ US la moins bien scorée : US-42 (23)  │
└──────────────────────────────────────────┘
```

### 2.2 — Composants

**MetricCard.tsx** — réutilisable :
```tsx
<MetricCard
  value={42}
  label="Analyses"
  icon={<SearchIcon />}
  trend="+15% vs mois dernier"  // optionnel
/>
```

Utiliser shadcn/ui Card. Chiffre en gros (text-3xl), label en petit (text-sm text-muted).

**Graphiques** — utiliser Recharts (déjà dans les deps) :
- `LineChart` pour le score trend (une ligne score moyen, optionnel : 5 dimensions en pointillés)
- `PieChart` pour frameworks et providers

### 2.3 — Route et navigation

Ajouter route `/settings/analytics` dans `App.tsx`.
Ajouter lien "Analytics" dans le menu Settings (AppLayout).

### 2.4 — État vide

Si aucune donnée pour la période : afficher un message "Pas encore d'activité ce mois" avec un bouton "Analyser vos premières US →" qui redirige vers `/stories`.

---

## PHASE 3 — Config coefficients + Export (~2h)

- Section "Paramètres d'estimation" en bas du dashboard : 3 inputs pour les minutes par analyse / génération / test manuel
- Bouton "Sauvegarder" → `PATCH /api/teams/me/analytics-config`
- Bouton "Exporter" → CSV avec toutes les métriques de la période

---

## Vérification

```bash
pnpm --filter backend test && pnpm --filter backend typecheck
pnpm --filter frontend typecheck
git commit -m "feat: 006-analytics-roi — usage metrics and ROI dashboard"
```
