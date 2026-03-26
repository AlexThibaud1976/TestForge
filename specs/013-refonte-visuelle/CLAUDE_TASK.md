# 🚀 Claude Code — TestForge UI Overhaul

> **Comment utiliser ce fichier :**
> Ouvre un terminal à la racine du monorepo TestForge et lance :
> ```bash
> claude < CLAUDE_TASK.md
> ```
> Ou copie-colle les tâches une par une dans Claude Code pour un contrôle plus fin.

---

## Contexte

TestForge est un SaaS B2B multi-tenant qui transforme des user stories Jira/Azure DevOps en tests automatisés Playwright/Selenium. L'app est fonctionnellement complète mais l'interface doit passer de "side project propre" à "SaaS professionnel crédible" pour une démo sur grand écran/projecteur devant des décideurs techniques début juin 2026.

Le monorepo utilise pnpm workspaces avec 3 packages :
- `apps/frontend/` — React 18 + Vite + TypeScript + shadcn/ui + Tailwind CSS v4
- `apps/backend/` — Node.js 20 + Express + TypeScript
- `packages/shared-types/` — Interfaces TypeScript partagées

**IMPORTANT : Cette refonte est 100% frontend. Ne touche AUCUN fichier backend.**

## Règles de code — NON-NÉGOCIABLES

1. **Test-first obligatoire** : Pour chaque nouveau composant, écrire le fichier `.test.tsx` AVANT le composant. Le test doit fail (red), puis l'implémentation le fait pass (green).
2. **TypeScript strict** : Aucun `any`, aucun `@ts-ignore`. Toutes les props sont typées avec des interfaces exportées.
3. **Documentation** : Chaque composant a des commentaires JSDoc sur ses props. Le README est mis à jour après chaque phase.
4. **Pas de lib externe** : Le radar chart est en SVG pur inline. Pas de Recharts, Chart.js, D3, ou autre. lucide-react est la seule lib d'icônes.
5. **Tree-shaking** : Import Lucide via un fichier centralisé `icons.ts`, pas d'import wildcard `import * from 'lucide-react'`.
6. **Non-régression** : Après chaque changement, vérifier `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
7. **Taille minimum 13px** : Aucune police en dessous de 13px dans l'app (11px acceptable uniquement pour les labels du radar chart).

---

## TÂCHE 1 — Palette & Utilitaires

### Objectif
Créer le socle de couleurs et le fichier de re-exports d'icônes Lucide.

### Fichiers à créer
- `apps/frontend/src/components/ui/theme.ts`
- `apps/frontend/src/components/ui/theme.test.ts`
- `apps/frontend/src/components/ui/icons.ts`

### Contenu attendu

**theme.test.ts** — écrire EN PREMIER :
```typescript
import { describe, it, expect } from 'vitest';
import { getScoreLevel, SCORE_COLORS, BRAND } from './theme';

describe('getScoreLevel', () => {
  it('returns "low" for scores < 40', () => {
    expect(getScoreLevel(0)).toBe('low');
    expect(getScoreLevel(39)).toBe('low');
  });
  it('returns "medium" for scores 40-70', () => {
    expect(getScoreLevel(40)).toBe('medium');
    expect(getScoreLevel(70)).toBe('medium');
  });
  it('returns "high" for scores > 70', () => {
    expect(getScoreLevel(71)).toBe('high');
    expect(getScoreLevel(100)).toBe('high');
  });
});

describe('SCORE_COLORS', () => {
  it('has valid hex colors for all levels', () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const level of Object.values(SCORE_COLORS)) {
      expect(level.bg).toMatch(hexRegex);
      expect(level.text).toMatch(hexRegex);
      expect(level.accent).toMatch(hexRegex);
      expect(level.border).toMatch(hexRegex);
    }
  });
});

describe('BRAND', () => {
  it('has primary, secondary, and accent colors', () => {
    expect(BRAND.primary).toBeDefined();
    expect(BRAND.secondary).toBeDefined();
    expect(BRAND.accent).toBeDefined();
  });
});
```

**theme.ts** — implémenter APRÈS que les tests fail :
```typescript
export const SCORE_COLORS = {
  high:   { bg: '#E6F9E6', text: '#1a7a1a', accent: '#22c55e', border: '#22c55e' },
  medium: { bg: '#FFF3E0', text: '#b86800', accent: '#f59e0b', border: '#f59e0b' },
  low:    { bg: '#FFE8E8', text: '#c43030', accent: '#ef4444', border: '#ef4444' },
} as const;

export const BRAND = {
  primary: '#3b82f6',
  secondary: '#6366f1',
  accent: '#22d3ee',
} as const;

export type ScoreLevel = keyof typeof SCORE_COLORS;

export function getScoreLevel(score: number): ScoreLevel {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
```

**icons.ts** :
```typescript
export {
  LayoutGrid,
  Clock,
  Plug,
  Bot,
  GitBranch,
  FileCode,
  Users,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --run theme.test
```

---

## TÂCHE 2 — Composant ScoreBadge (test-first)

### Objectif
Badge compact avec dot coloré sémantique pour afficher un score.

### Fichiers à créer
- `apps/frontend/src/components/ui/ScoreBadge.test.tsx`
- `apps/frontend/src/components/ui/ScoreBadge.tsx`

### Instructions
1. Écrire `ScoreBadge.test.tsx` avec ces cas :
   - Render avec score=82 → background vert, texte "82"
   - Render avec score=54 → background orange
   - Render avec score=28 → background rouge
   - Frontière score=70 → orange (pas vert)
   - Frontière score=71 → vert
   - Frontière score=40 → orange (pas rouge)
   - Frontière score=39 → rouge
   - showDot=true → un élément dot visible
   - showDot=false → pas de dot
2. Vérifier que les tests fail
3. Implémenter ScoreBadge.tsx
4. Vérifier que les tests pass

### Props interface
```typescript
export interface ScoreBadgeProps {
  score: number;
  showDot?: boolean;  // défaut true
  size?: 'sm' | 'md'; // défaut 'md'
  className?: string;
}
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --run ScoreBadge.test
```

---

## TÂCHE 3 — Composant RadarChart (test-first)

### Objectif
Radar chart SVG pur des 5 dimensions de score d'analyse. C'est LE composant hero du produit.

### Fichiers à créer
- `apps/frontend/src/components/ui/RadarChart.test.tsx`
- `apps/frontend/src/components/ui/RadarChart.tsx`

### Instructions
1. Écrire `RadarChart.test.tsx` avec ces cas :
   - Render SVG présent dans le DOM
   - 5 labels affichés : "Clarté", "Complétude", "Testabilité", "Cas limites", "Critères AC"
   - 3 polygons de grille de référence (33%, 66%, 100%)
   - 1 polygon de valeurs avec les bons scores
   - 5 lignes d'axes (du centre vers chaque sommet)
   - 5 circles (dots) aux sommets du polygon de valeurs
   - Cas limite : tous scores à 0 → polygon dégénéré (tous les points au centre)
   - Cas limite : tous scores à 100 → pentagone régulier
   - animated=false → pas d'élément `<animate>` dans le SVG
   - size prop respectée → attribut viewBox ou width/height correct
2. Vérifier que les tests fail
3. Implémenter RadarChart.tsx en SVG pur (voir plan.md §2.1 pour l'algorithme)
4. Vérifier que les tests pass

### Props interface
```typescript
export interface RadarChartProps {
  scores: {
    clarity: number;
    completeness: number;
    testability: number;
    edgeCases: number;
    acceptanceCriteria: number;
  };
  size?: number;             // défaut 240
  animated?: boolean;        // défaut true
  animationDuration?: number; // ms, défaut 800
  className?: string;
}
```

### Détails techniques
- Angle entre axes : 72° (360/5)
- Premier axe (clarté) en haut (angle = -π/2)
- Coordonnée d'un point : `x = cx + r * (score/100) * cos(angle)`, `y = cy + r * (score/100) * sin(angle)`
- Labels positionnés à 115% du rayon max, ajustés pour ne pas sortir du viewBox
- Animation SVG `<animate>` sur attribut `points`, durée configurable, ease-out

### Vérification
```bash
cd apps/frontend && pnpm test -- --run RadarChart.test
```

---

## TÂCHE 4 — Composant ScoreBarChart (test-first)

### Objectif
Barres de progression horizontales pour accompagner le radar chart.

### Fichiers à créer
- `apps/frontend/src/components/ui/ScoreBarChart.test.tsx`
- `apps/frontend/src/components/ui/ScoreBarChart.tsx`

### Instructions
1. Écrire les tests : 5 barres rendues, labels corrects, largeur proportionnelle, couleurs par tranche
2. Implémenter : liste de div flex avec label, barre track+fill, valeur numérique
3. Utiliser getScoreLevel() de theme.ts pour les couleurs

### Vérification
```bash
cd apps/frontend && pnpm test -- --run ScoreBarChart.test
```

---

## TÂCHE 5 — Composant Logo (test-first)

### Objectif
Logo SVG inline réutilisable (sidebar + landing page + favicon).

### Fichiers à créer
- `apps/frontend/src/components/ui/Logo.test.tsx`
- `apps/frontend/src/components/ui/Logo.tsx`

### Instructions
1. Écrire les tests : SVG présent, texte "TestForge" quand showText=true, pas de texte quand false
2. Implémenter un monogramme SVG simple (lettre stylisée ou forme géométrique + wordmark)
3. Couleurs : BRAND.primary + BRAND.secondary
4. Le design doit être simple et professionnel — pas de clipart ni de détail complexe

### Vérification
```bash
cd apps/frontend && pnpm test -- --run Logo.test
```

---

## TÂCHE 6 — Composant ProviderLogo + Assets SVG (test-first)

### Objectif
Composant centralisé qui affiche les logos officiels des providers tiers (LLM, sources, frameworks) avec fallback Lucide pour les marques sans autorisation.

### Fichiers à créer
- `apps/frontend/src/assets/logos/` (dossier + 9 SVGs)
- `apps/frontend/src/components/ui/ProviderLogo.test.tsx`
- `apps/frontend/src/components/ui/ProviderLogo.tsx`

### Instructions

**Étape 1 — Télécharger les logos officiels :**
Télécharger les SVGs depuis les sources autorisées UNIQUEMENT :
- OpenAI → openai.com/brand (logomark "blossom", version noir/monochrome)
- Mistral AI → mistral.ai/brand (logomark M géométrique)
- Ollama → github.com/ollama/ollama (logo depuis le repo, licence MIT)
- Jira → atlassian.design/foundations/logos (logomark triangle bleu, téléchargement officiel)
- GitHub → github.com/logos (Octocat silhouette monochrome)
- GitLab → about.gitlab.com/press/press-kit (tanuki, version monochrome)
- Playwright → github.com/microsoft/playwright.dev/blob/main/static/img/playwright-logo.svg
- Selenium → selenium.dev (logo Se depuis le site officiel)
- Cypress → cypress.io (logo C depuis le footer ou press kit)

Placer tous les fichiers dans `src/assets/logos/`. Puis optimiser :
```bash
pnpm add -D svgo
npx svgo src/assets/logos/*.svg --multipass
```

**Étape 2 — Tests (AVANT implémentation) :**
Écrire `ProviderLogo.test.tsx` avec ces cas :
- Provider 'openai' → un élément `<img>` avec src contenant 'openai' est rendu
- Provider 'mistral' → un élément `<img>` avec src contenant 'mistral' est rendu
- Provider 'anthropic' → PAS d'img, mais une icône Lucide Bot + texte "Claude"
- Provider 'azure_openai' → PAS d'img, mais une icône Lucide Cloud + texte "Azure OpenAI"
- Provider 'azure_devops' → PAS d'img, mais une icône Lucide Plug + texte "Azure DevOps"
- Provider 'xray' → PAS d'img, mais une icône Lucide TestTube2 + texte "Xray"
- Provider inconnu (cast) → fallback HelpCircle + texte du provider
- showLabel=true → label texte toujours visible, même avec logo
- showLabel=false + logo → pas de texte, juste le logo
- size=24 → img ou icône rendu en 24x24

**Étape 3 — Implémenter :**

```typescript
// Structure du registry
type LogoProvider =
  | 'openai' | 'anthropic' | 'mistral' | 'azure_openai' | 'ollama'
  | 'jira' | 'azure_devops' | 'xray' | 'github' | 'gitlab' | 'azure_repos'
  | 'playwright' | 'selenium' | 'cypress';

interface ProviderLogoProps {
  provider: LogoProvider;
  size?: number;       // défaut 20
  showLabel?: boolean; // défaut false
  className?: string;
}

// Chaque provider a : { logo: string | null, label: string, fallbackIcon: LucideIcon }
// logo = null → utiliser le fallback
```

**NE PAS utiliser les logos pour :** Anthropic/Claude, Azure OpenAI, Azure DevOps, Xray, Azure Repos. Ces marques n'ont pas de press kit public ou ont des guidelines restrictives. Utiliser icône Lucide + nom texte.

### Vérification
```bash
cd apps/frontend && pnpm test -- --run ProviderLogo.test
ls -la src/assets/logos/ # vérifier que les 9 SVGs sont présents
```

---

## TÂCHE 7 — Intégration Sidebar (AppLayout.tsx)

### Objectif
Remplacer emojis par icônes Lucide, intégrer le Logo, ajouter indicateurs visuels.

### Fichier à modifier
- `apps/frontend/src/components/layout/AppLayout.tsx`

### Instructions
1. D'abord, écrire/mettre à jour les tests de AppLayout :
   - Vérifier qu'AUCUN emoji Unicode n'est présent dans le DOM rendu (regex `[\u{1F000}-\u{1FFFF}]`)
   - Vérifier que les icônes Lucide sont rendues (chercher les SVG avec les bons data-testid)
   - Vérifier que le Logo est rendu
   - Vérifier que l'item actif a un indicateur visuel distinct
2. Modifier navSections : remplacer les `icon: '📋'` par les composants Lucide de `icons.ts`
3. Remplacer le span logo par `<Logo size={28} />`
4. Ajouter sur l'item NavLink actif : `border-left: 3px solid`, `font-weight: 500`
5. Avatar : `bg-gradient-to-br from-indigo-500 to-blue-500 text-white`

### Vérification
```bash
cd apps/frontend && pnpm typecheck && pnpm test && pnpm build
```

---

## TÂCHE 8 — Intégration Story Cards + StoryDetailPage + Logos Providers

### Objectif
Brancher ScoreBadge sur les cards, RadarChart + ScoreBarChart dans la page détail, et ProviderLogo partout où un provider tiers est affiché.

### Fichiers à modifier
- Le composant de story card (dans components/ ou pages/)
- `apps/frontend/src/pages/StoryDetailPage.tsx`
- Pages de settings : LLM, connexions, Git, FrameworkSelector

### Instructions
1. **Story cards :**
   - Remplacer le badge score actuel par `<ScoreBadge score={analysis.scoreGlobal} />`
   - Ajouter `style={{ borderLeft: '3px solid ${SCORE_COLORS[getScoreLevel(score)].border}' }}`
   - US non analysée → pas de border-left ou border gris
   - Ajouter `<ProviderLogo provider={connection.type} size={16} />` pour montrer la source (Jira/ADO)

2. **StoryDetailPage :**
   - Importer RadarChart et ScoreBarChart
   - Créer un layout flex dans la section analyse :
     ```tsx
     <div className="flex gap-6 items-start mt-4">
       <RadarChart
         scores={{
           clarity: analysis.scoreClarity,
           completeness: analysis.scoreCompleteness,
           testability: analysis.scoreTestability,
           edgeCases: analysis.scoreEdgeCases,
           acceptanceCriteria: analysis.scoreAcceptanceCriteria,
         }}
         size={240}
       />
       <ScoreBarChart scores={...mêmes scores} />
     </div>
     ```
   - Le score global reste visible comme heading au-dessus

3. **Logos providers dans les pages de settings :**
   - Page config LLM (`/settings/llm`) : ajouter `<ProviderLogo provider={config.provider} size={20} showLabel />` à côté de chaque config dans la liste
   - Page connexions (`/settings/connections`) : ajouter `<ProviderLogo provider={conn.type} size={20} showLabel />` à côté de chaque connexion
   - FrameworkSelector : ajouter `<ProviderLogo provider={framework} size={24} showLabel />` dans chaque option du sélecteur
   - Page config Git (`/settings/git`) : ajouter `<ProviderLogo provider={gitConfig.provider} size={20} showLabel />` à côté de chaque config

4. **Vérifier la cohérence visuelle :**
   - Tous les logos officiels (9) apparaissent nets à 150% zoom
   - Les fallback icône+texte (5 providers) sont visuellement alignés avec les vrais logos
   - Aucun logo ne déborde ou ne stretch

### Vérification
```bash
cd apps/frontend && pnpm typecheck && pnpm test && pnpm build
```

---

## TÂCHE 9 — Landing Page + Favicon + Grand Écran

### Objectif
Derniers ajustements visuels avant la démo.

### Fichiers à modifier
- `apps/frontend/src/pages/LandingPage.tsx`
- `apps/frontend/index.html` (favicon)
- Pages de contenu (max-width)

### Instructions
1. **LandingPage** : remplacer "🔧 TestForge" par `<Logo />` dans la navbar
2. **LandingPage** : ajouter les logos frameworks (Playwright, Selenium, Cypress) via `<ProviderLogo>` dans la section "Vos frameworks"
3. **Favicon** : générer un favicon 32x32 à partir du Logo (version icon-only)
4. **Grand écran** : ajouter `max-w-[1200px] mx-auto` sur les conteneurs de pages principales
5. **Vérifier** : police minimum 13px, gaps suffisants, radar lisible à 150% zoom

### Vérification
```bash
cd apps/frontend && pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Puis vérification manuelle : ouvrir dans Chrome, zoom 150%, parcours complet
```

---

## TÂCHE 10 — Documentation & Validation Finale

### Objectif
Mettre à jour toute la documentation et valider la non-régression complète.

### Instructions
1. Mettre à jour `README.md` :
   - Ajouter section "UI Components" décrivant RadarChart, ScoreBadge, ScoreBarChart, Logo, ProviderLogo
   - Documenter la palette (theme.ts)
   - Ajouter les icônes utilisées et leur mapping
   - Ajouter la matrice de conformité marque (quels logos sont officiels, quels sont des fallbacks)
   - Documenter la procédure pour ajouter un nouveau logo provider à l'avenir
2. Vérifier la checklist de validation grand écran (voir plan.md §6)
3. Exécuter la suite complète :
   ```bash
   pnpm typecheck && pnpm lint && pnpm test && pnpm build
   ```
4. Vérifier qu'aucun emoji ne subsiste dans le code :
   ```bash
   grep -rn '[\x{1F000}-\x{1FFFF}]' apps/frontend/src/ || echo "Clean!"
   ```

---

> 📝 Pour les détails complets (10 tâches) :
> - Spec fonctionnelle : voir `spec.md` (user stories, critères d'acceptation, matrice conformité marque)
> - Architecture technique : voir `plan.md` (algorithmes, structures SVG, palette, ProviderLogo registry)
> - Checklist phase par phase : voir `tasks.md`
