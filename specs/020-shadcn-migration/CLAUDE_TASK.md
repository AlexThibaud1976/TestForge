# 🚀 Claude Code — Migration shadcn/ui

> ```bash
> claude < specs/008-shadcn-migration/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge est un SaaS React + Vite + Tailwind CSS v4. L'architecture prévoit shadcn/ui mais tous les composants sont en Tailwind brut. Cette tâche migre l'ensemble de l'UI vers shadcn/ui pour un rendu professionnel et cohérent.

**État actuel :**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (pas de `tailwind.config.ts`)
- CSS variables shadcn-compatibles déjà dans `index.css` (`--color-background`, `--color-foreground`, `--radius`)
- **Pas de path alias `@/`** dans `vite.config.ts` ni `tsconfig.json`
- **Pas de shadcn installé** — aucun composant dans `components/ui/`
- **Pas de `cn()` utility** — classes Tailwind en string brut partout
- `recharts` déjà installé (feature 004 Analytics)
- ~15 pages + ~15 composants partagés à migrer

---

## Règles (NON-NÉGOCIABLES)

1. **AUCUN changement de fonctionnalité** — chaque page fonctionne identiquement après migration
2. **TypeScript strict** — aucun `any`, aucun `@ts-ignore`
3. **Migration page par page** — pas de big bang, vérifier `pnpm typecheck && pnpm build` après chaque page
4. **Le `<Select>` shadcn utilise `onValueChange` au lieu de `onChange`** — adapter chaque usage
5. **Les imports existants en `../lib/api.js` restent inchangés** — seuls les imports de `components/ui/` utilisent `@/`
6. **Ne PAS utiliser `npx shadcn@latest init`** — créer les composants manuellement pour contrôler le setup Tailwind v4

---

## TÂCHE 1 — Configuration initiale

### 1a. Installer les dépendances

```bash
cd apps/frontend

# Utilitaires shadcn
pnpm add class-variance-authority clsx tailwind-merge

# Radix UI primitives
pnpm add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-separator

# Icônes
pnpm add lucide-react
```

### 1b. Configurer le path alias `@/`

**Modifier `apps/frontend/vite.config.ts` :**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3099',
        changeOrigin: true,
      },
    },
  },
});
```

**Modifier `apps/frontend/tsconfig.json` — ajouter `baseUrl` et `paths` :**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    // ... tout le reste inchangé
  }
}
```

### 1c. Créer l'utilitaire `cn()`

**Créer `apps/frontend/src/lib/utils.ts` :**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 1d. Vérifier

```bash
pnpm typecheck && pnpm build
```

---

## TÂCHE 2 — Créer les composants UI shadcn

Créer chaque composant dans `apps/frontend/src/components/ui/`. **Copier le code source depuis https://ui.shadcn.com/docs/components/ et adapter les imports pour utiliser `@/lib/utils`.**

Les composants shadcn utilisent un pattern standard. Voici les 8 composants prioritaires :

### `button.tsx`

```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils.js';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white shadow hover:bg-blue-700',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline: 'border border-gray-300 bg-white shadow-sm hover:bg-gray-50 text-gray-700',
        secondary: 'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 text-gray-700',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Autres composants

Pour `input.tsx`, `label.tsx`, `card.tsx`, `badge.tsx`, `select.tsx`, `dialog.tsx`, `tabs.tsx`, `progress.tsx`, `tooltip.tsx`, `separator.tsx`, `skeleton.tsx`, `alert.tsx` :

**Aller sur https://ui.shadcn.com/docs/components/[nom] et copier le code source.** Adapter :
- Remplacer `import { cn } from "@/lib/utils"` par `import { cn } from '@/lib/utils.js'` (extension `.js` obligatoire dans le projet)
- Pour le `Badge`, ajouter des variantes custom : `success` (vert), `warning` (jaune) en plus des variantes par défaut
- Pour le `Button`, les couleurs sont adaptées au thème TestForge (bleu primary au lieu du noir shadcn par défaut)

**⚠️ Le `Select` shadcn est le composant le plus différent du `<select>` natif :**

```tsx
// AVANT (select natif) :
<select value={filter} onChange={(e) => setFilter(e.target.value)}>
  <option value="">Tous</option>
  <option value="a">Option A</option>
</select>

// APRÈS (shadcn Select) :
<Select value={filter} onValueChange={(value) => setFilter(value)}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Tous" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">Tous</SelectItem>
    <SelectItem value="a">Option A</SelectItem>
  </SelectContent>
</Select>
```

**Piège important :** shadcn `Select` ne supporte PAS `value=""` (chaîne vide). Utiliser un placeholder comme `"__all__"` et mapper vers `""` dans le handler :
```typescript
onValueChange={(v) => setFilter(v === '__all__' ? '' : v)}
```

### Vérifier

```bash
pnpm typecheck && pnpm build
```

---

## TÂCHE 3 — Migrer les 4 pages démo

### StoriesPage.tsx

**Remplacements clés :**

```tsx
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Card, CardContent } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { Skeleton } from '@/components/ui/skeleton.js';
```

- Chaque `<button>` sync → `<Button variant="outline" size="sm">`
- Le `<input>` recherche → `<Input placeholder="Rechercher..." />`
- Les `<select>` filtres → `<Select>` shadcn (⚠️ `onValueChange`)
- Les cards story → `<Card>` (conserver le `onClick` de navigation)
- Les badges statut → `<Badge variant={...}>`
- Les skeletons loading → `<Skeleton className="h-16 w-full" />`

### StoryDetailPage.tsx

**Le plus gros changement : le système d'onglets**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';

// AVANT : state activeTab + boutons custom TabButton
// APRÈS :
<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
  <TabsList>
    <TabsTrigger value="analysis">📋 Analyse & US</TabsTrigger>
    <TabsTrigger value="generation" disabled={analysisState !== 'done'}>
      ⚙️ Génération de tests
    </TabsTrigger>
  </TabsList>
  <TabsContent value="analysis">
    {/* Contenu onglet analyse — inchangé */}
  </TabsContent>
  <TabsContent value="generation">
    {/* Contenu onglet génération — inchangé */}
  </TabsContent>
</Tabs>
```

- Supprimer le composant local `TabButton` — remplacé par `TabsTrigger`
- Supprimer le composant local `Card` — remplacé par le shadcn `Card`
- Les boutons "Analyser", "Générer", "Relancer" → `<Button>`
- Le toggle Original/Améliorée/Diff → `<Tabs>` secondaire (nested)

### AnalyticsPage.tsx + analytics/*

- Les KPI cards → `<Card>` + `<CardHeader>` + `<CardTitle>` + `<CardContent>`
- Les boutons → `<Button>`
- Le select filtre → `<Select>` shadcn

### HistoryPage.tsx + history/*

- Les cards génération → `<Card>`
- Les badges → `<Badge>`
- Les boutons ZIP/Voir US → `<Button variant="outline" size="sm">`

**Après chaque page :** `pnpm typecheck && pnpm build`

---

## TÂCHE 4 — Migrer les pages settings (6 pages)

**Pattern commun pour les formulaires :**

```tsx
// AVANT :
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md ..." />
</div>

// APRÈS :
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>
```

Pages : `ConnectionsPage`, `LLMConfigPage`, `GitConfigPage`, `TeamPage`, `BillingPage`, `PomTemplatesPage`.

Pour chaque page, le pattern est le même : remplacer les inputs/labels/buttons/cards/selects.

---

## TÂCHE 5 — Migrer auth + admin + landing + composants partagés

### Pages auth (Login, Register, Invite)

Wrapper le formulaire dans `<Card>` + utiliser `<Input>`, `<Label>`, `<Button>`.

### SuperAdminPage

`<Card>` pour les stat cards + `<Badge>` pour les plans + `<Button>` pour suspend/reactivate.

### LandingPage

`<Button size="lg">` pour les CTAs + `<Card>` pour les feature cards.

### Composants partagés critiques

**WritebackButton + GitPushButton → `<Dialog>` shadcn :**

```tsx
// AVANT (modal hand-made) :
{showDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
      {/* contenu */}
    </div>
  </div>
)}

// APRÈS (Dialog shadcn) :
<Dialog open={showDialog} onOpenChange={setShowDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Pousser vers Git</DialogTitle>
      <DialogDescription>Sélectionnez le repo cible et le mode.</DialogDescription>
    </DialogHeader>
    {/* contenu du formulaire — inchangé */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
      <Button onClick={handlePush} disabled={pushing}>
        {pushing ? 'Push en cours...' : 'Pousser'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**⚠️ Le Dialog shadcn a un focus trap intégré et se ferme avec Escape.** Supprimer tout code custom de fermeture par Escape ou clic outside — le Dialog le gère.

**BatchAnalysisModal → `<Dialog>` + `<Progress>` :**

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>Analyse en cours — {completed}/{total} US</DialogTitle>
    </DialogHeader>
    <Progress value={(completed / total) * 100} className="mb-4" />
    {/* liste scrollable */}
  </DialogContent>
</Dialog>
```

**OnboardingWizard → `<Dialog>` + `<Progress>` + `<Button>` :**

Même pattern que BatchAnalysisModal.

**ConnectionFilter → `<Select>` shadcn :**

Remplacer le `<select>` natif par le `Select` shadcn avec icônes Jira/ADO dans les `SelectItem`.

**DiffViewer → `<Tabs>` pour le toggle + `<Badge>` pour le compteur :**

```tsx
<Tabs value={mode} onValueChange={(v) => setMode(v as 'unified' | 'side-by-side')}>
  <TabsList>
    <TabsTrigger value="unified">Unifié</TabsTrigger>
    <TabsTrigger value="side-by-side">Côte à côte</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## TÂCHE 6 — Nettoyage + vérification finale

```bash
# 1. TypeScript strict
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Tests — adapter si des tests cassent à cause des changements de DOM
pnpm test

# 4. Build
pnpm build

# 5. Vérifier la taille du bundle
# Noter le avant/après — l'ajout de Radix devrait être < 30KB gzippé

# 6. Pas de résidus
grep -r "className=\".*px-[0-9].*py-[0-9].*bg-blue-600.*text-white.*rounded" apps/frontend/src/pages/
# → devrait retourner 0 lignes (les boutons primaires utilisent <Button> maintenant)

# 7. Mettre à jour le README — section Tech Stack
# Ajouter : "UI Components: shadcn/ui + Radix UI + Tailwind CSS v4"
```

---

## Récapitulatif

### Composants UI créés (~14)
```
apps/frontend/src/components/ui/
├── alert.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── label.tsx
├── progress.tsx
├── select.tsx
├── separator.tsx
├── skeleton.tsx
├── tabs.tsx
└── tooltip.tsx
```

### Utilitaire créé (1)
```
apps/frontend/src/lib/utils.ts          # cn()
```

### Config modifiée (2)
```
apps/frontend/vite.config.ts            # alias @/
apps/frontend/tsconfig.json             # paths @/*
```

### Pages migrées (~15)
```
Toutes les pages dans apps/frontend/src/pages/
```

### Composants partagés migrés (~15)
```
AppLayout, ConnectionFilter, ConnectionBadge, WritebackButton, GitPushButton,
XrayTestButton, ADOTestCaseButton, OnboardingBanner, OnboardingWizard,
BatchAnalysisModal, DiffViewer, ErrorBoundary, history/*, analytics/*, batch/*
```

---

## Les 3 pièges à éviter absolument

1. **`Select` shadcn n'accepte pas `value=""`** — utiliser un sentinel `"__all__"` mappé vers `""` dans le handler
2. **Les imports de composants UI doivent finir par `.js`** — convention du projet : `import { Button } from '@/components/ui/button.js'`
3. **Ne pas mélanger `<Dialog>` shadcn avec des modals hand-made dans le même composant** — migrer tout le composant d'un coup

---

> 📝 Specs : `specs/008-shadcn-migration/`
> ⚠️ Aucun changement de fonctionnalité — migration visuelle uniquement
