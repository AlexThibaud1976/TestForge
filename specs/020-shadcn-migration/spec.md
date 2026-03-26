# Spécification — TestForge : Migration shadcn/ui

> Migrer l'ensemble des composants UI vers shadcn/ui pour un rendu professionnel et cohérent.
> Spécification détaillée — 2026-03-26

---

## 1. Vue d'Ensemble

### Problème

L'architecture doc et le plan.md prévoient "shadcn/ui + Tailwind CSS" mais en pratique, tous les composants sont écrits en Tailwind brut : `<select>` natifs, `<button>` avec classes inline, modals hand-made avec `position: fixed`, inputs sans gestion du focus. Le résultat est fonctionnel mais visuellement inégal entre les pages — chaque développeur (Claude Code) a réinventé les mêmes patterns avec des variantes de style.

### Solution

Installer et configurer shadcn/ui, puis migrer systématiquement tous les composants UI vers les primitives shadcn. La migration est page par page, chaque page étant testée visuellement avant de passer à la suivante.

### Périmètre

**Composants shadcn à installer et utiliser :**

| Composant shadcn | Remplace | Utilisé dans |
|---|---|---|
| `Button` | `<button className="...">` | Partout (~15 pages) |
| `Input` | `<input className="...">` | Formulaires (Connections, LLM, Git, Team, Login, Register) |
| `Select` | `<select>` natif | Filtres (Stories, History, Analytics), configs (LLM, Git) |
| `Card` | `<div className="bg-white border ...">` | Story cards, KPI cards, settings cards |
| `Badge` | `<span className="text-xs px-2 ...">` | Status badges, labels, ConnectionBadge |
| `Dialog` | `<div className="fixed inset-0 ...">` | WritebackButton, GitPushButton, BatchAnalysisModal |
| `Tabs` | Toggle buttons hand-made | StoryDetailPage (Analyse/Génération), Diff (Original/Améliorée/Diff) |
| `Progress` | `<div>` avec width % | BatchAnalysisModal, Onboarding |
| `Tooltip` | Aucun (manquant) | Boutons désactivés, infos contextuelles |
| `Label` | `<label className="...">` | Tous les formulaires |
| `Separator` | `<div className="border-t ...">` | Sections dans les settings |
| `Dropdown Menu` | Non existant | Actions contextuelles (futur) |
| `Alert` | `<div className="bg-red-50 ...">` | Messages d'erreur, warnings |
| `Skeleton` | `<div className="animate-pulse ...">` | Loading states |

**Pages à migrer (par ordre de priorité démo) :**

1. **StoriesPage** — page principale, vue par tous
2. **StoryDetailPage** — la plus complexe (onglets, scores, génération)
3. **AnalyticsPage** — dashboard KPI, démo showcase
4. **HistoryPage** — arbre collapsible
5. **ConnectionsPage** — formulaires CRUD
6. **LLMConfigPage** — formulaires CRUD
7. **GitConfigPage** — formulaires CRUD
8. **TeamPage** — gestion membres
9. **BillingPage** — abonnement
10. **PomTemplatesPage** — formulaire textarea
11. **SuperAdminPage** — admin dashboard
12. **LoginPage / RegisterPage / InvitePage** — auth
13. **LandingPage** — page publique
14. **AppLayout** — sidebar + navigation
15. **Composants partagés** — ConnectionFilter, ConnectionBadge, WritebackButton, GitPushButton, OnboardingWizard, BatchAnalysisModal, DiffViewer, ErrorBoundary

**Hors périmètre :**
- Changement de la palette de couleurs (on garde les couleurs actuelles)
- Refonte du layout (sidebar structure identique)
- Ajout de dark mode (P2 post-démo)
- Changement de fonctionnalité (migration visuelle uniquement)

---

## 2. Règles de migration

### Principes NON-NÉGOCIABLES

1. **Aucun changement de fonctionnalité** — chaque page doit fonctionner identiquement après migration
2. **Migration page par page** — pas de big bang, chaque page est un commit testable
3. **Tests après chaque page** — `pnpm typecheck && pnpm build` minimum après chaque migration
4. **Les composants shadcn sont dans `components/ui/`** — convention shadcn standard
5. **L'utilitaire `cn()` est utilisé partout** — `clsx` + `tailwind-merge` pour composer les classes

### Pattern de remplacement

| Avant (Tailwind brut) | Après (shadcn) |
|---|---|
| `<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">` | `<Button>` |
| `<button className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50">` | `<Button variant="outline">` |
| `<button className="text-xs text-red-500 hover:text-red-700">` | `<Button variant="ghost" size="sm">` |
| `<input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">` | `<Input>` |
| `<select className="px-3 py-2 border border-gray-300 rounded-md">` | `<Select><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>...</SelectContent></Select>` |
| `<div className="bg-white border border-gray-200 rounded-lg p-4">` | `<Card><CardContent>...</CardContent></Card>` |
| `<span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">` | `<Badge variant="success">` |
| `<div className="fixed inset-0 bg-black/50 flex items-center justify-center">` | `<Dialog><DialogContent>...</DialogContent></Dialog>` |

---

## 3. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Non-régression | Chaque page fonctionne identiquement après migration |
| Performance | Taille du bundle augmente de < 30KB gzippé (Radix primitives) |
| Accessibilité | Les composants shadcn apportent du ARIA gratis (Dialog, Select, Tabs) |
| Cohérence | Même `Button` variant partout — plus de 5 styles de boutons différents |
| TypeScript | Tous les composants shadcn sont typés — pas de régression strict |
