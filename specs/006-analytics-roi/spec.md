# Feature Specification: Analytics & ROI Dashboard

**Feature Branch**: `006-analytics-roi`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Dashboard analytics montrant les métriques d'utilisation et le ROI de TestForge pour une équipe : nombre de tests générés, temps estimé gagné, évolution du score moyen des US, répartition par framework, et tendances inter-sprint. L'argument de vente pour les décideurs.

### Problème

Aujourd'hui, il n'y a aucune visibilité sur l'impact de TestForge. Le QA lead ne peut pas justifier le coût de l'abonnement à son management. "On a gagné du temps" ne suffit pas — il faut des chiffres.

### Solution

Un dashboard accessible dans Settings > Analytics qui agrège les données existantes (tables `analyses`, `generations`, `manual_test_sets`) et calcule des métriques clés avec des estimations de temps gagné.

---

## User Stories

### US-AR-1 — Métriques d'utilisation par période (Priority: P1)

Thomas (Tech Lead) ouvre le dashboard Analytics et voit les métriques clés du mois : nombre d'analyses, de générations, de tests manuels, et le temps estimé gagné.

**Independent Test**: Effectuer 5 analyses + 3 générations → ouvrir le dashboard → vérifier les chiffres.

**Acceptance Scenarios**:

1. **Given** 10 analyses et 5 générations ce mois, **When** Thomas ouvre le dashboard, **Then** il voit : "10 US analysées", "5 suites de tests générées", "~7h30 économisées" (estimation : 1h30 par suite de tests écrits manuellement).
2. **Given** le dashboard ouvert, **When** Thomas change la période (ce mois / ce trimestre / tout), **Then** les métriques se mettent à jour.
3. **Given** aucune activité ce mois, **When** Thomas ouvre le dashboard, **Then** un message "Pas encore d'activité ce mois" est affiché avec un CTA vers la page Stories.

---

### US-AR-2 — Évolution du score moyen des US (Priority: P1)

Marc (PO) veut voir si la qualité de ses US s'améliore au fil des sprints. Un graphique montre le score moyen par semaine/mois.

**Independent Test**: Avoir des analyses sur 3 semaines différentes → vérifier le graphique de tendance.

**Acceptance Scenarios**:

1. **Given** des analyses sur 4 semaines, **When** Marc consulte le graphique, **Then** un line chart affiche le score moyen par semaine avec les 5 dimensions en overlay.
2. **Given** une tendance à la hausse, **Then** un message "Score moyen en hausse de +12% ce mois" est affiché.
3. **Given** le graphique, **When** Marc survole un point, **Then** un tooltip montre : semaine, score moyen, nombre d'US analysées.

---

### US-AR-3 — Répartition et tops (Priority: P2)

Le dashboard montre la répartition par framework, par provider LLM, et les "tops" (US la mieux scorée, la moins bien scorée, la plus souvent regénérée).

**Acceptance Scenarios**:

1. **Given** des générations Playwright TS (8) et Selenium Java (3), **Then** un donut chart montre la répartition 73%/27%.
2. **Given** les analyses, **Then** le top 3 des US les moins bien scorées est affiché avec lien direct.

---

## Edge Cases

- Équipe nouvelle sans données → dashboard vide avec onboarding CTA
- Période sans activité → message "Pas d'activité" (pas de graphique vide)
- Estimation du temps gagné configurable par l'équipe (par défaut : 1h30 par génération auto, 30min par analyse, 45min par lot de tests manuels)

---

## Requirements

- **FR-AR-001**: Le dashboard DOIT afficher : nombre d'analyses, de générations, de tests manuels, par période configurable.
- **FR-AR-002**: Le temps estimé gagné DOIT être calculé avec des coefficients par défaut (configurables par équipe).
- **FR-AR-003**: Un graphique de tendance du score moyen DOIT être affiché (line chart par semaine).
- **FR-AR-004**: La répartition par framework et par provider LLM DOIT être visible (donut charts).
- **FR-AR-005**: Les données DOIVENT provenir d'agrégats SQL sur les tables existantes (pas de table analytics dédiée en v1).
- **FR-AR-006**: Le dashboard DOIT être accessible via Settings > Analytics.
- **Plan**: disponible sur Starter (métriques basiques) et Pro (graphiques de tendance + export).

---

# Implementation Plan

## Architecture

Pas de table analytics dédiée — les métriques sont des agrégats SQL sur `analyses`, `generations`, `manual_test_sets`. Un seul endpoint retourne toutes les métriques d'un coup.

### Endpoint

**GET `/api/analytics?period=month|quarter|all`**
```json
{
  "period": { "from": "2026-03-01", "to": "2026-03-31" },
  "counts": {
    "analyses": 42,
    "generations": 18,
    "manualTestSets": 12,
    "manualTestCases": 67
  },
  "timeSaved": {
    "totalMinutes": 2430,
    "breakdown": {
      "analyses": 1260,       // 42 × 30min
      "generations": 1620,    // 18 × 90min
      "manualTests": 540      // 12 × 45min
    },
    "coefficients": { "analysis": 30, "generation": 90, "manualTest": 45 }
  },
  "scoreTrend": [
    { "week": "2026-W10", "meanScore": 58, "count": 12 },
    { "week": "2026-W11", "meanScore": 63, "count": 15 },
    { "week": "2026-W12", "meanScore": 67, "count": 10 }
  ],
  "distribution": {
    "frameworks": { "playwright+typescript": 12, "selenium+java": 4, "playwright+csharp": 2 },
    "llmProviders": { "openai": 14, "anthropic": 3, "azure_openai": 1 }
  },
  "highlights": {
    "bestScoredUS": { "id": "uuid", "title": "...", "score": 92 },
    "worstScoredUS": { "id": "uuid", "title": "...", "score": 23 },
    "scoreTrendPercent": 12.4
  }
}
```

### Coefficients de temps configurables

Ajout d'une colonne `analytics_coefficients` (jsonb) sur la table `teams` :
```json
{ "analysisMinutes": 30, "generationMinutes": 90, "manualTestMinutes": 45 }
```

Valeurs par défaut si null. Configurable dans Settings > Analytics.

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Endpoint analytics + agrégats SQL | ~4h |
| Phase 2 — Frontend dashboard (métriques + chart) | ~8h |
| Phase 3 — Config coefficients + export | ~2h |
| **Total** | **~14h** |

---

# Tasks

---

## Phase 1: Endpoint Analytics (~4h)

- [ ] T001 [P] Créer `apps/backend/src/services/analytics/AnalyticsService.ts` :
  - `getMetrics(teamId, period: 'month' | 'quarter' | 'all')` — requêtes SQL agrégées sur analyses, generations, manual_test_sets
  - Calcul du score trend par semaine (GROUP BY date_trunc('week', created_at))
  - Calcul du temps gagné avec les coefficients de l'équipe (ou défauts)
  - Répartition par framework et provider
  - Highlights : best/worst scored US, trend percent
- [ ] T002 [P] Ajouter route `GET /api/analytics` dans `apps/backend/src/routes/analytics.ts` — requireAuth, query param `period`
- [ ] T003 Migration : `ALTER TABLE teams ADD COLUMN analytics_coefficients JSONB DEFAULT NULL;`
- [ ] T004 Enregistrer la route dans `apps/backend/src/index.ts`
- [ ] T005 Tests unitaires AnalyticsService (DB mockée) — vérifier calculs moyennes, distribution, trend

**Checkpoint** : `GET /api/analytics` retourne les métriques correctes.

---

## Phase 2: Frontend Dashboard (~8h)

- [ ] T006 [P] Créer `apps/frontend/src/pages/AnalyticsPage.tsx` :
  - Header : 4 metric cards (analyses, générations, tests manuels, temps gagné)
  - Graphique de tendance : line chart du score moyen par semaine (Recharts ou Chart.js via shadcn)
  - Donut charts : répartition frameworks + providers
  - Section "Points clés" : best/worst US, tendance score
  - Sélecteur de période (ce mois / ce trimestre / tout)
- [ ] T007 Ajouter route `/settings/analytics` dans `App.tsx` et lien dans le menu Settings
- [ ] T008 Composant `MetricCard.tsx` — réutilisable, affiche un chiffre + label + icône + variation (↑/↓)
- [ ] T009 Gérer l'état "pas de données" — message encourageant + CTA vers Stories
- [ ] T010 Responsive : le dashboard doit être lisible sur mobile (cards en colonne, chart pleine largeur)

**Checkpoint** : Dashboard visuel fonctionnel avec graphiques.

---

## Phase 3: Config + Export (~2h)

- [ ] T011 Ajouter section "Configurer les estimations de temps" dans la page Analytics — 3 champs : minutes par analyse, par génération, par lot de tests manuels
- [ ] T012 Endpoint `PATCH /api/teams/me/analytics-config` — persiste `analytics_coefficients` sur la team
- [ ] T013 Bouton "Exporter le rapport" (PDF ou CSV) — résumé des métriques de la période sélectionnée

**Checkpoint** : Coefficients configurables, export fonctionnel.
