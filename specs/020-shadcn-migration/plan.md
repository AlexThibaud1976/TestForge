# Plan Technique — Migration shadcn/ui

> 2026-03-26

---

## Summary

Migration purement frontend. Aucune modification backend. Installer shadcn/ui avec ses dépendances (Radix UI primitives, class-variance-authority, clsx, tailwind-merge), puis remplacer systématiquement les composants hand-made par les primitives shadcn dans chaque page. Configuration initiale nécessaire : path alias `@/`, fichier `components.json`, utilitaire `cn()`.

---

## 1. Configuration initiale — Points critiques

### Tailwind CSS v4 + shadcn v2

Le projet utilise Tailwind CSS v4 via `@tailwindcss/vite` (pas de `tailwind.config.ts`). shadcn v2 supporte Tailwind v4 mais la configuration est différente de v3. Les CSS variables sont déjà en place dans `index.css` (format compatible).

### Path alias `@/` requis

shadcn suppose un alias `@/` vers `src/`. Il faut le configurer dans **deux endroits** :

**1. `vite.config.ts` :**
```typescript
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // ... existant
});
```

**2. `tsconfig.json` :**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Dépendances à installer

```bash
pnpm --filter @testforge/frontend add class-variance-authority clsx tailwind-merge
pnpm --filter @testforge/frontend add @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-separator @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot
pnpm --filter @testforge/frontend add lucide-react
```

**Note :** On installe manuellement les packages Radix au lieu d'utiliser `npx shadcn@latest init` car le setup Tailwind v4 + monorepo pnpm peut causer des problèmes avec le CLI shadcn. On crée les composants à la main en copiant le code source depuis ui.shadcn.com.

### Utilitaire `cn()` — à créer en premier

```typescript
// apps/frontend/src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 2. Composants shadcn à créer

Chaque composant va dans `apps/frontend/src/components/ui/`. Le code est copié depuis ui.shadcn.com et adapté si nécessaire.

| Composant | Dépendance Radix | Priorité |
|---|---|---|
| `button.tsx` | `@radix-ui/react-slot` | P1 — utilisé partout |
| `input.tsx` | Aucune (HTML natif) | P1 — formulaires |
| `label.tsx` | `@radix-ui/react-label` | P1 — formulaires |
| `card.tsx` | Aucune (div stylé) | P1 — cards partout |
| `badge.tsx` | Aucune (span stylé) | P1 — statuts, labels |
| `select.tsx` | `@radix-ui/react-select` | P1 — filtres, configs |
| `dialog.tsx` | `@radix-ui/react-dialog` | P1 — modals |
| `tabs.tsx` | `@radix-ui/react-tabs` | P1 — StoryDetailPage |
| `progress.tsx` | `@radix-ui/react-progress` | P2 — batch, onboarding |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | P2 — infos contextuelles |
| `separator.tsx` | `@radix-ui/react-separator` | P2 — sections |
| `skeleton.tsx` | Aucune (div animé) | P2 — loading states |
| `alert.tsx` | Aucune (div stylé) | P2 — erreurs, warnings |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | P3 — futur |

---

## 3. Stratégie de migration page par page

### Ordre d'exécution (par impact démo)

**Batch 1 — Fondation (avant toute page) :**
- Configurer alias, dépendances, `cn()`
- Créer les 8 composants UI P1 dans `components/ui/`
- Vérifier que `pnpm build` passe

**Batch 2 — Pages démo (les 4 que le public verra) :**
- `StoriesPage.tsx` — Button, Select, Card, Badge, Input, Skeleton
- `StoryDetailPage.tsx` — Tabs, Button, Card, Badge, Dialog (la plus complexe)
- `AnalyticsPage.tsx` — Card, Badge, Button, Input (TimeEstimateConfig)
- `HistoryPage.tsx` — Card, Badge, Button

**Batch 3 — Pages settings :**
- `ConnectionsPage.tsx` — Input, Label, Select, Button, Card, Dialog
- `LLMConfigPage.tsx` — Input, Label, Select, Button, Card
- `GitConfigPage.tsx` — Input, Label, Select, Button, Card
- `TeamPage.tsx` — Input, Button, Badge, Card
- `BillingPage.tsx` — Card, Button, Badge
- `PomTemplatesPage.tsx` — Input, Button, Card

**Batch 4 — Pages auth + admin :**
- `LoginPage.tsx` — Input, Label, Button, Card
- `RegisterPage.tsx` — Input, Label, Button, Card
- `InvitePage.tsx` — Input, Button, Card
- `SuperAdminPage.tsx` — Card, Badge, Button

**Batch 5 — Layout + composants partagés :**
- `AppLayout.tsx` — Separator, Tooltip (sidebar)
- `LandingPage.tsx` — Button, Card, Badge (page publique)
- Composants partagés : ConnectionFilter, ConnectionBadge, WritebackButton, GitPushButton, XrayTestButton, ADOTestCaseButton, OnboardingWizard, BatchAnalysisModal, DiffViewer, ErrorBoundary

---

## 4. Stratégie de test

### Pas de tests unitaires de composants shadcn

Les composants `ui/` sont des copies de shadcn — ils sont déjà testés par l'écosystème. Ce qu'on teste :

### Vérification par batch

Après chaque batch :
```bash
pnpm typecheck        # TypeScript strict — aucune erreur
pnpm lint             # ESLint
pnpm build            # Vite build — vérifie que tout compile
```

### Vérification visuelle manuelle

Chaque page migrée doit être vérifiée visuellement :
- Même layout, même espacement
- Boutons cliquables et interactifs
- Formulaires fonctionnels (submit, validation)
- Modals ouvrent/ferment correctement
- Select affiche les options
- Pas de flash/glitch visuel

### Tests existants

Tous les tests frontend existants (hooks, composants) doivent continuer à passer. Si un test importe un composant migré, adapter l'import si nécessaire.

---

## 5. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Le `Select` shadcn (Radix) se comporte différemment du `<select>` natif | Moyen | Le `Select` shadcn utilise un popover — les handlers `onChange` deviennent `onValueChange`. Adapter chaque usage. |
| Le `Dialog` shadcn gère le focus trap automatiquement | Faible | C'est un avantage (accessibilité), mais vérifier que les modals existants ne cassent pas |
| Le path alias `@/` casse les imports existants `.js` | Moyen | Les imports existants en `../lib/api.js` continuent de fonctionner. Les nouveaux composants UI utilisent `@/`. Ne PAS migrer tous les imports existants — seulement les imports de `components/ui/` |
| Tailwind v4 CSS variables conflictent avec shadcn | Faible | Les variables dans `index.css` sont déjà au format shadcn — vérifier la compatibilité |
| `lucide-react` augmente la taille du bundle | Faible | Tree-shakable — n'importe que les icônes utilisées |
| La migration casse les tests frontend existants | Moyen | Si un test render un composant qui utilise maintenant `Dialog`, le test doit wrapper avec le provider Radix. Adapter au cas par cas. |

---

## 6. Fichiers impactés

### À créer (~16 fichiers)
```
apps/frontend/src/lib/utils.ts                    # cn() utility
apps/frontend/src/components/ui/button.tsx
apps/frontend/src/components/ui/input.tsx
apps/frontend/src/components/ui/label.tsx
apps/frontend/src/components/ui/card.tsx
apps/frontend/src/components/ui/badge.tsx
apps/frontend/src/components/ui/select.tsx
apps/frontend/src/components/ui/dialog.tsx
apps/frontend/src/components/ui/tabs.tsx
apps/frontend/src/components/ui/progress.tsx
apps/frontend/src/components/ui/tooltip.tsx
apps/frontend/src/components/ui/separator.tsx
apps/frontend/src/components/ui/skeleton.tsx
apps/frontend/src/components/ui/alert.tsx
```

### À modifier (~20+ fichiers)
```
apps/frontend/vite.config.ts                       # Path alias @/
apps/frontend/tsconfig.json                        # paths @/*
apps/frontend/src/index.css                        # Vérifier/ajuster variables CSS shadcn
apps/frontend/src/pages/StoriesPage.tsx
apps/frontend/src/pages/StoryDetailPage.tsx
apps/frontend/src/pages/AnalyticsPage.tsx
apps/frontend/src/pages/HistoryPage.tsx
apps/frontend/src/pages/ConnectionsPage.tsx
apps/frontend/src/pages/LLMConfigPage.tsx
apps/frontend/src/pages/GitConfigPage.tsx
apps/frontend/src/pages/TeamPage.tsx
apps/frontend/src/pages/BillingPage.tsx
apps/frontend/src/pages/PomTemplatesPage.tsx
apps/frontend/src/pages/SuperAdminPage.tsx
apps/frontend/src/pages/LoginPage.tsx
apps/frontend/src/pages/RegisterPage.tsx
apps/frontend/src/pages/InvitePage.tsx
apps/frontend/src/pages/LandingPage.tsx
apps/frontend/src/components/layout/AppLayout.tsx
apps/frontend/src/components/WritebackButton.tsx
apps/frontend/src/components/GitPushButton.tsx
apps/frontend/src/components/XrayTestButton.tsx
apps/frontend/src/components/ADOTestCaseButton.tsx
apps/frontend/src/components/ConnectionFilter.tsx
apps/frontend/src/components/ConnectionBadge.tsx
apps/frontend/src/components/onboarding/*
apps/frontend/src/components/batch/*
apps/frontend/src/components/diff/*
apps/frontend/src/components/history/*
apps/frontend/src/components/analytics/*
apps/frontend/src/components/ErrorBoundary.tsx
```

### Aucune modification backend
