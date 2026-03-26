# Checklist d'Implémentation — Dashboard Analytics

> Dernière mise à jour : 2026-03-26
> Estimation totale : ~10-12h
> **Prérequis :** Feature 002-p1-project-filter mergée (hook `useConnectionFilter`)

---

## Phase 1 : Setup — Migration + dépendance (0.5h)

**But :** Préparer la base pour le backend et le frontend.

- [ ] T001 Créer migration `apps/backend/src/db/migrations/XXXX_add_manual_test_minutes.sql` : `ALTER TABLE teams ADD COLUMN manual_test_minutes SMALLINT NOT NULL DEFAULT 30;`
- [ ] T002 Ajouter la colonne `manualTestMinutes` dans le schéma Drizzle `apps/backend/src/db/schema.ts` (table `teams`)
- [ ] T003 Exécuter la migration : `cd apps/backend && pnpm db:migrate`
- [ ] T004 Installer recharts : `pnpm --filter @testforge/frontend add recharts`
- [ ] T005 Vérifier que `pnpm typecheck` et `pnpm build` passent toujours

**Checkpoint :** Migration appliquée, recharts installé, build propre.

---

## Phase 2 : Backend — Endpoint analytics agrégé (2.5h)

**But :** Créer `GET /api/analytics/dashboard` et `PUT /api/teams/me/test-estimate`.

### 2a — Tests endpoint (RED)

- [ ] T006 Écrire test : `GET /api/analytics/dashboard should return all 4 sections`
- [ ] T007 Écrire test : `should calculate correct average score`
- [ ] T008 Écrire test : `should categorize scores into green/yellow/red buckets`
- [ ] T009 Écrire test : `should return weekly scores for last 12 weeks only`
- [ ] T010 Écrire test : `should filter all metrics by connectionId`
- [ ] T011 Écrire test : `should only return data for the authenticated team`
- [ ] T012 Écrire test : `should return zeros when no analyses exist`
- [ ] T013 Écrire test : `should calculate timeSavedMinutes from team config`
- [ ] T014 Écrire test : `PUT /api/teams/me/test-estimate should update manualTestMinutes`
- [ ] T015 Écrire test : `should reject values outside 5-240 range`
- [ ] T016 Écrire test : `should require admin role`
- [ ] T017 Vérifier RED

### 2b — Implémentation endpoints (GREEN)

- [ ] T018 Créer `apps/backend/src/routes/analytics.ts` avec les deux routes
- [ ] T019 Implémenter les 4 requêtes agrégées en `Promise.all` (KPIs, distribution, weekly, byConnection)
- [ ] T020 Implémenter le filtre optionnel `connectionId` (join conditionnel analyses → userStories)
- [ ] T021 Utiliser `COUNT(DISTINCT generations.id)` pour le `generationCount` dans byConnection
- [ ] T022 Implémenter `PUT /api/teams/me/test-estimate` avec validation Zod + `requireAdmin`
- [ ] T023 Monter le router dans `apps/backend/src/index.ts` : `app.use('/api/analytics', analyticsRouter)`
- [ ] T024 Vérifier GREEN + non-régression (`pnpm test`)

**Checkpoint :** Endpoints fonctionnels, 11 tests au vert.

---

## Phase 3 : Hook `useAnalyticsData` — Test-First (1h)

**But :** Fetch les données analytics et les exposer au composant page.

### 3a — Tests (RED)

- [ ] T025 Écrire test : `should fetch from /api/analytics/dashboard`
- [ ] T026 Écrire test : `should pass connectionId to API when provided`
- [ ] T027 Écrire test : `should handle empty data (new account — all zeros)`
- [ ] T028 Écrire test : `should refetch when connectionId changes`
- [ ] T029 Vérifier RED

### 3b — Implémentation (GREEN)

- [ ] T030 Créer `apps/frontend/src/hooks/useAnalyticsData.ts`
- [ ] T031 Typer la réponse API avec l'interface `AnalyticsDashboard`
- [ ] T032 Implémenter le fetch avec `api.get<>` + state loading/error/data
- [ ] T033 Re-fetch quand `connectionId` change (useEffect dependency)
- [ ] T034 Vérifier GREEN

**Checkpoint :** Hook fonctionnel, 4 tests au vert.

---

## Phase 4 : Composants Charts — Test-First (4h)

**But :** Les 5 composants visuels du dashboard.

### 4a — `KpiCards` (4 cards métriques)

#### Tests (RED)

- [ ] T035 Écrire test : `should render 4 cards with correct values`
- [ ] T036 Écrire test : `should format timeSaved as hours and minutes`
- [ ] T037 Écrire test : `should show correct color badge for average score`
- [ ] T038 Vérifier RED

#### Implémentation (GREEN)

- [ ] T039 Créer `apps/frontend/src/components/analytics/KpiCards.tsx`
- [ ] T040 4 cards : Score moyen (avec badge couleur), Total analyses, Tests générés, Temps économisé
- [ ] T041 Formater le temps : `1050 min → "17h 30min"`, `45 min → "45min"`
- [ ] T042 Vérifier GREEN

### 4b — `ScoreDistribution` (donut chart)

#### Tests (RED)

- [ ] T043 Écrire test : `should render donut with 3 segments (green, yellow, red)`
- [ ] T044 Écrire test : `should show center label with average score`
- [ ] T045 Vérifier RED

#### Implémentation (GREEN)

- [ ] T046 Créer `apps/frontend/src/components/analytics/ScoreDistribution.tsx`
- [ ] T047 Utiliser `recharts` `PieChart` + `Pie` + `Cell` avec `innerRadius` pour le donut
- [ ] T048 Couleurs : `#22C55E` (vert), `#EAB308` (jaune), `#EF4444` (rouge) — cohérent avec l'existant
- [ ] T049 Label central : score moyen en grand + "/100" en petit
- [ ] T050 Légende en bas : "🟢 22 (46%) · 🟡 18 (37%) · 🔴 8 (17%)"
- [ ] T051 Vérifier GREEN

### 4c — `ScoreEvolution` (line chart)

#### Tests (RED)

- [ ] T052 Écrire test : `should render line chart with weekly data points`
- [ ] T053 Écrire test : `should handle empty weeks gracefully`
- [ ] T054 Vérifier RED

#### Implémentation (GREEN)

- [ ] T055 Créer `apps/frontend/src/components/analytics/ScoreEvolution.tsx`
- [ ] T056 Utiliser `recharts` `LineChart` + `Line` + `XAxis` + `YAxis` + `Tooltip`
- [ ] T057 Axe X : semaines formatées ("S12", "S13"...), axe Y : 0-100
- [ ] T058 Tooltip : score exact + nombre d'analyses cette semaine
- [ ] T059 Ligne bleue avec points, épaisseur 2px, courbe `monotone`
- [ ] T060 Vérifier GREEN

### 4d — `ProjectBreakdown` (bar chart horizontal)

#### Tests (RED)

- [ ] T061 Écrire test : `should render one bar per connection`
- [ ] T062 Écrire test : `should sort by average score descending`
- [ ] T063 Vérifier RED

#### Implémentation (GREEN)

- [ ] T064 Créer `apps/frontend/src/components/analytics/ProjectBreakdown.tsx`
- [ ] T065 Utiliser `recharts` `BarChart` layout `vertical` + `Bar` + `XAxis` + `YAxis`
- [ ] T066 Couleur de chaque barre selon score (vert/jaune/rouge)
- [ ] T067 À droite : badge "20 📊 15 ⚙️" (analyses + tests) en texte
- [ ] T068 Icône type (🔵/🟣) devant chaque nom de connexion
- [ ] T069 Vérifier GREEN

### 4e — `TimeEstimateConfig` (inline config)

#### Tests (RED)

- [ ] T070 Écrire test : `should show current value and allow editing`
- [ ] T071 Écrire test : `should call API on save and update parent`
- [ ] T072 Écrire test : `should validate range 5-240`
- [ ] T073 Vérifier RED

#### Implémentation (GREEN)

- [ ] T074 Créer `apps/frontend/src/components/analytics/TimeEstimateConfig.tsx`
- [ ] T075 Mode lecture : affiche "(30 min/test)" avec icône ⚙️ cliquable
- [ ] T076 Mode édition : input number + boutons Sauver/Annuler
- [ ] T077 Appel `PUT /api/teams/me/test-estimate` au save
- [ ] T078 Vérifier GREEN

**Checkpoint :** 5 composants, 14 tests frontend au vert.

---

## Phase 5 : Intégration — Page + route + sidebar (1.5h)

**But :** Assembler le tout dans `AnalyticsPage.tsx`, ajouter la route, vérifier le sidebar.

- [ ] T079 Créer `apps/frontend/src/pages/AnalyticsPage.tsx` :
  - `useConnectionFilter()` pour le filtre
  - `useAnalyticsData(connectionId)` pour les données
  - Layout : KpiCards (haut) → Distribution + Evolution (milieu, 2 colonnes) → ProjectBreakdown (bas)
- [ ] T080 Ajouter la route `/analytics` dans `apps/frontend/src/App.tsx` (dans `ProtectedRoutes`)
- [ ] T081 Vérifier que le lien "Analytics" dans `AppLayout.tsx` navigue vers `/analytics` (ajuster si nécessaire)
- [ ] T082 Passer `onUpdateEstimate` callback de `AnalyticsPage` vers `TimeEstimateConfig` → re-fetch analytics après update
- [ ] T083 Test manuel complet : 4 KPI cards, donut, courbe, barres, filtre connexion, config temps

**Checkpoint :** Dashboard fonctionnel end-to-end.

---

## Phase 6 : Documentation & Polish (1h)

- [ ] T084 Mettre à jour le User Guide : nouvelle section "Analytics"
- [ ] T085 Vérifier que `pnpm typecheck` passe sans erreur
- [ ] T086 Vérifier que `pnpm lint` passe
- [ ] T087 Vérifier que `pnpm test` passe (existants + nouveaux)
- [ ] T088 Vérifier la taille du bundle post-recharts : `cd apps/frontend && pnpm build` → noter la taille
- [ ] T089 Pas de `any`, pas de TODO, pas de console.log
- [ ] T090 Commit + push → CI verte

**Checkpoint :** Feature prête pour merge.

---

## Récapitulatif

| Phase | Tâches | Temps estimé | Dépendance |
|---|---|---|---|
| 1. Setup | T001–T005 | 0.5h | — |
| 2. Backend endpoints | T006–T024 | 2.5h | Phase 1 |
| 3. Hook useAnalyticsData | T025–T034 | 1h | Phase 2 |
| 4. Composants charts | T035–T078 | 4h | Phase 3 |
| 5. Intégration page | T079–T083 | 1.5h | Phase 4 + P1 |
| 6. Docs & polish | T084–T090 | 1h | Phase 5 |
| **Total** | **90 tâches** | **~10.5h** | |

---

> 📊 Progression : 0 / 90 tâches complétées
> ⚠️ Prérequis : feature 002-p1-project-filter (hook `useConnectionFilter`) doit être mergée.
