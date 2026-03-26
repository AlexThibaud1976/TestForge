# Checklist — Migration shadcn/ui

> Estimation : ~10-12h | Prérequis : aucun (migration visuelle uniquement)
> **Règle d'or :** Aucun changement de fonctionnalité. Chaque page fonctionne identiquement après migration.

---

## Phase 1 : Setup — Config + utilitaires + composants UI (2h)

**But :** Installer, configurer, créer les composants shadcn de base.

- [ ] T001 Installer les dépendances : `class-variance-authority clsx tailwind-merge lucide-react`
- [ ] T002 Installer les primitives Radix : `@radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-separator @radix-ui/react-label @radix-ui/react-slot`
- [ ] T003 Configurer le path alias `@/` dans `vite.config.ts` et `tsconfig.json`
- [ ] T004 Créer `apps/frontend/src/lib/utils.ts` avec la fonction `cn()`
- [ ] T005 Vérifier que `pnpm typecheck && pnpm build` passent
- [ ] T006 Créer `components/ui/button.tsx` (variantes : default, outline, ghost, destructive, sizes sm/default/lg)
- [ ] T007 Créer `components/ui/input.tsx`
- [ ] T008 Créer `components/ui/label.tsx`
- [ ] T009 Créer `components/ui/card.tsx` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
- [ ] T010 Créer `components/ui/badge.tsx` (variantes : default, secondary, success, warning, destructive, outline)
- [ ] T011 Créer `components/ui/select.tsx` (Select, SelectTrigger, SelectValue, SelectContent, SelectItem)
- [ ] T012 Créer `components/ui/dialog.tsx` (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter)
- [ ] T013 Créer `components/ui/tabs.tsx` (Tabs, TabsList, TabsTrigger, TabsContent)
- [ ] T014 Créer `components/ui/progress.tsx`
- [ ] T015 Créer `components/ui/tooltip.tsx` (Tooltip, TooltipTrigger, TooltipContent, TooltipProvider)
- [ ] T016 Créer `components/ui/separator.tsx`
- [ ] T017 Créer `components/ui/skeleton.tsx`
- [ ] T018 Créer `components/ui/alert.tsx` (Alert, AlertTitle, AlertDescription)
- [ ] T019 Vérifier que `pnpm typecheck && pnpm build` passent avec tous les composants

**Checkpoint :** 14 composants UI créés, build propre. Aucune page modifiée encore.

---

## Phase 2 : Pages démo — les 4 prioritaires (3h)

**But :** Migrer les pages visibles pendant la démo Itecor.

### StoriesPage.tsx

- [ ] T020 Remplacer les `<button>` par `<Button>` (sync, pagination, filtres)
- [ ] T021 Remplacer le `<select>` status par `<Select>` shadcn
- [ ] T022 Remplacer le `<select>` connexion par `<Select>` shadcn (⚠️ `onValueChange` au lieu de `onChange`)
- [ ] T023 Remplacer le `<input>` recherche par `<Input>`
- [ ] T024 Remplacer les cards `UserStoryCard` par `<Card>` + `<CardContent>`
- [ ] T025 Remplacer les badges statut `StatusBadge` par `<Badge>`
- [ ] T026 Remplacer les skeletons `animate-pulse` par `<Skeleton>`
- [ ] T027 `pnpm typecheck && pnpm build` + vérification visuelle

### StoryDetailPage.tsx

- [ ] T028 Remplacer le toggle "Analyse / Génération" par `<Tabs>` + `<TabsList>` + `<TabsTrigger>` + `<TabsContent>`
- [ ] T029 Remplacer le toggle "Original / Améliorée / Diff" par `<Tabs>` secondaire
- [ ] T030 Remplacer les `<Card>` locales par `<Card>` shadcn
- [ ] T031 Remplacer les `<button>` (Analyser, Générer, Relancer) par `<Button>`
- [ ] T032 Remplacer les badges de score par `<Badge>`
- [ ] T033 Remplacer les `<select>` de `FrameworkSelector` par `<Select>` shadcn
- [ ] T034 `pnpm typecheck && pnpm build` + vérification visuelle

### AnalyticsPage.tsx + composants analytics/*

- [ ] T035 Remplacer les KPI cards par `<Card>` + `<CardHeader>` + `<CardTitle>`
- [ ] T036 Remplacer les boutons par `<Button>`
- [ ] T037 Remplacer le `<select>` filtre connexion par `<Select>` shadcn
- [ ] T038 Wrapper les charts dans des `<Card>` shadcn
- [ ] T039 `pnpm typecheck && pnpm build` + vérification visuelle

### HistoryPage.tsx + composants history/*

- [ ] T040 Remplacer les cards de génération par `<Card>`
- [ ] T041 Remplacer les badges par `<Badge>`
- [ ] T042 Remplacer les boutons (ZIP, Voir US) par `<Button variant="outline" size="sm">`
- [ ] T043 `pnpm typecheck && pnpm build` + vérification visuelle

**Checkpoint :** 4 pages démo migrées, build propre.

---

## Phase 3 : Pages settings (2.5h)

- [ ] T044 **ConnectionsPage** : Input, Label, Select, Button, Card, Dialog pour le formulaire de création
- [ ] T045 **LLMConfigPage** : Input, Label, Select, Button, Card
- [ ] T046 **GitConfigPage** : Input, Label, Select, Button, Card
- [ ] T047 **TeamPage** : Input, Button, Badge, Card, Separator
- [ ] T048 **BillingPage** : Card, Button, Badge
- [ ] T049 **PomTemplatesPage** : Input (textarea reste natif ou `<Textarea>` si créé), Button, Card
- [ ] T050 `pnpm typecheck && pnpm build` + vérification visuelle sur chaque page

**Checkpoint :** 6 pages settings migrées.

---

## Phase 4 : Pages auth + admin + landing (1.5h)

- [ ] T051 **LoginPage** : Card (wrapper), Input, Label, Button
- [ ] T052 **RegisterPage** : Card, Input, Label, Button
- [ ] T053 **InvitePage** : Card, Input, Button
- [ ] T054 **SuperAdminPage** : Card, Badge, Button, Skeleton
- [ ] T055 **LandingPage** : Button (CTAs), Card (feature cards), Badge
- [ ] T056 `pnpm typecheck && pnpm build`

**Checkpoint :** Pages auth + admin + landing migrées.

---

## Phase 5 : Layout + composants partagés (2h)

- [ ] T057 **AppLayout** : Separator entre sections sidebar, Tooltip sur les liens nav
- [ ] T058 **ConnectionFilter** : remplacer le `<select>` par `<Select>` shadcn
- [ ] T059 **ConnectionBadge** : remplacer par `<Badge>` shadcn avec variant custom
- [ ] T060 **WritebackButton** : remplacer le modal hand-made par `<Dialog>` shadcn + `<Button>`
- [ ] T061 **GitPushButton** : remplacer le modal hand-made par `<Dialog>` shadcn + `<Button>` + `<Select>`
- [ ] T062 **XrayTestButton** : `<Button>` + `<Dialog>` si dialog existant
- [ ] T063 **ADOTestCaseButton** : `<Button>` + `<Dialog>` si dialog existant
- [ ] T064 **OnboardingBanner** : `<Card>`, `<Progress>`, `<Button>`
- [ ] T065 **OnboardingWizard** : `<Dialog>`, `<Progress>`, `<Button>`, `<Input>`, `<Select>`
- [ ] T066 **BatchAnalysisModal** : `<Dialog>`, `<Progress>`, `<Badge>`, `<Button>`
- [ ] T067 **DiffViewer** : `<Tabs>` pour le toggle unified/side-by-side, `<Badge>` pour le compteur
- [ ] T068 **ErrorBoundary** : `<Alert>`, `<Button>`
- [ ] T069 **Composants history/*** : `<Card>`, `<Badge>`, `<Button>` déjà faits en phase 2
- [ ] T070 **Composants analytics/*** : déjà faits en phase 2
- [ ] T071 `pnpm typecheck && pnpm build`

**Checkpoint :** Tous les composants partagés migrés.

---

## Phase 6 : Nettoyage + vérification finale (1h)

- [ ] T072 Supprimer les classes Tailwind redondantes (styles qui sont maintenant gérés par shadcn)
- [ ] T073 Vérifier que l'`index.css` est compatible (pas de variables CSS conflictuelles)
- [ ] T074 `pnpm typecheck` — 0 erreur
- [ ] T075 `pnpm lint` — 0 warning
- [ ] T076 `pnpm test` — tous les tests passent (adapter si nécessaire les tests qui importent des composants migrés)
- [ ] T077 `pnpm build` — build propre, noter la taille du bundle (avant vs après)
- [ ] T078 Vérification visuelle complète de chaque page (checklist manuelle)
- [ ] T079 Pas de `any`, pas de `@ts-ignore`, pas de console.log
- [ ] T080 Mettre à jour le README : mentionner shadcn/ui dans la stack
- [ ] T081 Commit + push → CI verte

---

## Récapitulatif

| Phase | Tâches | Temps estimé |
|---|---|---|
| 1. Setup + composants UI | T001–T019 | 2h |
| 2. Pages démo (4 pages) | T020–T043 | 3h |
| 3. Pages settings (6 pages) | T044–T050 | 2.5h |
| 4. Auth + admin + landing | T051–T056 | 1.5h |
| 5. Layout + partagés | T057–T071 | 2h |
| 6. Nettoyage + vérification | T072–T081 | 1h |
| **Total** | **81 tâches** | **~12h** |

---

> 📊 Progression : 0 / 81 tâches
> ⚠️ Règle : AUCUN changement de fonctionnalité. Migration visuelle uniquement.
