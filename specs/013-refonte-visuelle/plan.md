# Plan Technique — TestForge UI Overhaul v1.0

> Architecture d'implémentation de la refonte UI — Mars 2026
> Voir spec.md pour les user stories et les features détaillées.
> Ce plan est un module complémentaire au plan technique principal de TestForge v2.

---

## 1. Architecture des Changements

### Principe directeur

Aucune modification backend. Tous les changements sont dans `apps/frontend/src/`. La refonte est purement visuelle et ne touche ni les routes API, ni la logique métier, ni le schéma de base de données.

### Cartographie des fichiers impactés

```
apps/frontend/src/
├── assets/
│   └── logos/                      ← CRÉER (SVGs officiels providers tiers)
│       ├── openai.svg
│       ├── mistral.svg
│       ├── ollama.svg
│       ├── jira.svg
│       ├── github.svg
│       ├── gitlab.svg
│       ├── playwright.svg
│       ├── selenium.svg
│       └── cypress.svg
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx           ← MODIFIER (sidebar, logo, icônes)
│   ├── analysis/
│   │   ├── AnalysisScore.tsx       ← MODIFIER (intégrer RadarChart + ScoreBarChart)
│   │   └── SuggestionsList.tsx     (inchangé)
│   ├── ui/
│   │   ├── RadarChart.tsx          ← CRÉER (composant radar SVG)
│   │   ├── ScoreBadge.tsx          ← CRÉER (badge score coloré)
│   │   ├── ScoreBarChart.tsx       ← CRÉER (barres de progression)
│   │   ├── ProviderLogo.tsx        ← CRÉER (logos providers avec fallback Lucide)
│   │   ├── Logo.tsx                ← CRÉER (logo SVG inline)
│   │   └── icons.ts               ← CRÉER (re-exports Lucide centralisés)
│   └── stories/
│       └── StoryCard.tsx           ← MODIFIER (border-left + ScoreBadge)
├── pages/
│   ├── StoryDetailPage.tsx         ← MODIFIER (intégrer nouveaux composants)
│   ├── StoriesListPage.tsx         ← MODIFIER (header enrichi + StoryCard)
│   └── LandingPage.tsx             ← MODIFIER (logo, palette — v1.1 hero)
└── styles/
    └── theme.ts                    ← CRÉER (palette étendue centralisée)
```

### Stack des changements

| Couche | Technologie | Usage |
|--------|-------------|-------|
| Icônes | lucide-react (déjà dispo) | Remplacement emojis navigation |
| SVG | Inline SVG (React) | Radar chart, logo — pas de lib externe |
| Animation | CSS @keyframes + SVG animate | Animation radar, transitions hover |
| Palette | Tailwind CSS v4 config | Variables couleurs secondaires |
| Tests | Vitest + @testing-library/react | Tests unitaires composants UI |

---

## 2. Composants — Spécifications Techniques

### 2.1 RadarChart.tsx

**Principe :** SVG pur inline, aucune dépendance externe. Le composant calcule les coordonnées des sommets du pentagone par trigonométrie.

**Algorithme de positionnement :**

```typescript
// Pour chaque axe i (0-4), angle = (i * 2π / 5) - π/2 (start at top)
// Point sur l'axe = (cx + radius * score/100 * cos(angle), cy + radius * score/100 * sin(angle))

const AXES = ['clarity', 'completeness', 'testability', 'edgeCases', 'acceptanceCriteria'] as const;
const LABELS = ['Clarté', 'Complétude', 'Testabilité', 'Cas limites', 'Critères AC'];

function getPoint(index: number, value: number, radius: number, cx: number, cy: number) {
  const angle = (index * 2 * Math.PI / 5) - Math.PI / 2;
  return {
    x: cx + radius * (value / 100) * Math.cos(angle),
    y: cy + radius * (value / 100) * Math.sin(angle),
  };
}
```

**Structure SVG :**
1. `<polygon>` pour chaque grille de référence (33%, 66%, 100%) — stroke gris clair
2. `<line>` pour chaque axe (du centre au bord) — stroke gris clair
3. `<polygon>` pour les valeurs — fill blue-500 à 15% opacité, stroke blue-500 1.5px
4. `<circle>` pour chaque point de sommet — fill blue-500, r=3
5. `<text>` pour chaque label d'axe — positionné à 110% du rayon maximal

**Animation :** SVG `<animate>` sur l'attribut `points` du polygon de valeurs. Durée : 800ms. Easing : ease-out. Points de départ : tous au centre.

**Props interface :**
```typescript
interface RadarChartProps {
  scores: Record<typeof AXES[number], number>;
  size?: number;            // défaut 240
  animated?: boolean;       // défaut true
  animationDuration?: number; // ms, défaut 800
  className?: string;
}
```

### 2.2 ScoreBadge.tsx

**Structure :**
```tsx
<span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}>
  {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
  {score}
</span>
```

**Palette de couleurs :**
```typescript
function getScoreColors(score: number) {
  if (score > 70) return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' };
  if (score >= 40) return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
  return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
}
```

### 2.3 Logo.tsx

**Structure :** Composant SVG inline retournant un `<svg>` avec :
- Un monogramme stylisé (lettre "T" + accent géométrique)
- Viewbox calibré pour 28x28 (sidebar) et 32x32 (landing page)
- Couleurs : blue-600 + indigo-500

**Props :**
```typescript
interface LogoProps {
  size?: number;    // défaut 28
  showText?: boolean; // défaut true — affiche "TestForge" à côté
  className?: string;
}
```

### 2.4 icons.ts (re-exports centralisés)

```typescript
// Centraliser les imports Lucide pour tree-shaking optimal
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
  Cloud,
  TestTube2,
  HelpCircle,
} from 'lucide-react';
```

### 2.5 ProviderLogo.tsx (logos providers tiers)

**Principe :** Composant qui affiche le logo SVG officiel d'un provider, ou un fallback icône Lucide + texte pour les providers sans autorisation de logo.

**Architecture :**
```typescript
// Imports statiques des SVGs (Vite les bundle automatiquement)
import openaiLogo from '../../assets/logos/openai.svg';
import mistralLogo from '../../assets/logos/mistral.svg';
// ... etc.

// Registry des logos avec metadata
const PROVIDER_REGISTRY: Record<LogoProvider, ProviderMeta> = {
  openai:       { logo: openaiLogo, label: 'OpenAI', fallbackIcon: Bot },
  anthropic:    { logo: null, label: 'Claude', fallbackIcon: Bot },
  mistral:      { logo: mistralLogo, label: 'Mistral AI', fallbackIcon: Bot },
  azure_openai: { logo: null, label: 'Azure OpenAI', fallbackIcon: Cloud },
  ollama:       { logo: ollamaLogo, label: 'Ollama', fallbackIcon: Bot },
  jira:         { logo: jiraLogo, label: 'Jira', fallbackIcon: Plug },
  azure_devops: { logo: null, label: 'Azure DevOps', fallbackIcon: Plug },
  xray:         { logo: null, label: 'Xray', fallbackIcon: TestTube2 },
  github:       { logo: githubLogo, label: 'GitHub', fallbackIcon: GitBranch },
  gitlab:       { logo: gitlabLogo, label: 'GitLab', fallbackIcon: GitBranch },
  azure_repos:  { logo: null, label: 'Azure Repos', fallbackIcon: GitBranch },
  playwright:   { logo: playwrightLogo, label: 'Playwright', fallbackIcon: TestTube2 },
  selenium:     { logo: seleniumLogo, label: 'Selenium', fallbackIcon: TestTube2 },
  cypress:      { logo: cypressLogo, label: 'Cypress', fallbackIcon: TestTube2 },
};
```

**Rendu :**
- Si `logo` est non-null → `<img src={logo} width={size} height={size} alt={label} />`
- Si `logo` est null → `<FallbackIcon size={size} /> <span>{label}</span>`
- `showLabel=true` → ajoute toujours le label texte à côté, même avec logo

**Gestion des SVG assets :**
- Les SVG sont téléchargés depuis les sources officielles (voir spec.md §F4)
- Nettoyés avec `svgo` pour supprimer les métadonnées inutiles
- Stockés dans `src/assets/logos/` — bundlés statiquement par Vite
- Pas de fetch réseau au runtime

### 2.6 theme.ts (palette étendue)

```typescript
export const SCORE_COLORS = {
  high:   { bg: '#E6F9E6', text: '#1a7a1a', accent: '#22c55e', border: '#22c55e' },
  medium: { bg: '#FFF3E0', text: '#b86800', accent: '#f59e0b', border: '#f59e0b' },
  low:    { bg: '#FFE8E8', text: '#c43030', accent: '#ef4444', border: '#ef4444' },
} as const;

export const BRAND = {
  primary: '#3b82f6',    // blue-500
  secondary: '#6366f1',  // indigo-500
  accent: '#22d3ee',     // cyan-400
} as const;

export function getScoreLevel(score: number): keyof typeof SCORE_COLORS {
  if (score > 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
```

---

## 3. Modifications de Fichiers Existants

### 3.1 AppLayout.tsx — Refonte sidebar

**Changements :**
1. Remplacer le tableau `navSections` avec emojis par un tableau avec composants Lucide
2. Remplacer le span "🔧 TestForge" par `<Logo />`
3. Ajouter un border-left accent sur l'item actif
4. Remplacer `bg-blue-100` de l'avatar par un gradient `bg-gradient-to-br from-indigo-500 to-blue-500`
5. Ajouter un gradient subtil sur le fond de la sidebar

**Impact :** Aucun changement fonctionnel. La structure NavLink + NavLink est conservée.

### 3.2 StoryCard.tsx (ou le composant de story list)

**Changements :**
1. Ajouter `border-left: 3px solid ${SCORE_COLORS[level].border}` conditionnel
2. Remplacer le badge numérique brut par `<ScoreBadge />`

### 3.3 StoryDetailPage.tsx — Section analyse

**Changements :**
1. Importer `RadarChart` et `ScoreBarChart`
2. Remplacer l'affichage des scores (s'il est un simple texte/badge) par un layout flex :
   - Gauche : `<RadarChart scores={...} />`
   - Droite : `<ScoreBarChart scores={...} />`
3. Le score global reste visible en tant que heading au-dessus

### 3.4 LandingPage.tsx — Ajustements v1

**Changements :**
1. Remplacer "🔧 TestForge" dans la navbar par `<Logo />`
2. Mettre à jour les variables de couleur pour utiliser la palette étendue
3. (v1.1) Ajouter un hero visual avec screenshot

---

## 4. Stratégie de Test

### Tests unitaires (Vitest + @testing-library/react)

| Composant | Ce qu'on teste | Cas limites |
|-----------|---------------|-------------|
| RadarChart | Render SVG correct, 5 polygones de grille, polygon de valeurs, labels | Scores à 0, scores à 100, scores mixtes, animated=false |
| ScoreBadge | Couleur correcte par tranche de score, présence du dot | Score = 0, score = 40 (frontière), score = 70 (frontière), score = 100 |
| ScoreBarChart | 5 barres rendues, largeurs proportionnelles | Tous scores identiques, un score à 0, un score à 100 |
| Logo | SVG rendu, props size/showText respectées | size=0, showText=false |
| ProviderLogo | Logo SVG affiché pour providers autorisés, fallback Lucide+texte pour les autres | Provider inconnu → fallback HelpCircle, provider avec logo=null → icône+texte |
| AppLayout (sidebar) | Icônes Lucide rendues (pas d'emojis), item actif avec accent | Route inconnue, super admin non visible si pas admin |

### Approche test-first

Pour chaque composant, le workflow est :
1. Écrire le fichier de test `ComponentName.test.tsx`
2. Vérifier que le test fail (red)
3. Implémenter le composant
4. Vérifier que le test pass (green)
5. Refactorer si nécessaire

### Tests de non-régression

| Vérification | Méthode |
|---|---|
| Navigation fonctionne toujours | Test existant StoryDetailPage (si existant) ne casse pas |
| Aucun emoji restant dans le DOM | `screen.queryByText(/[\u{1F000}-\u{1FFFF}]/u)` retourne null |
| Pas de texte tronqué à 150% zoom | Vérification manuelle (checklist démo) |
| Lucide tree-shaking effectif | `pnpm build` puis vérifier taille du bundle (< delta 50KB) |

### Couverture cible

| Type | Cible |
|------|-------|
| Unit (nouveaux composants) | 100% — ce sont des composants purs sans side effects |
| Snapshot | 1 snapshot par composant pour détecter les régressions visuelles |
| E2E | Non requis — pas de changement fonctionnel |

---

## 5. Gestion des Dépendances

### Dépendances existantes (aucun ajout requis)

- `lucide-react` — déjà dans le package.json frontend
- `tailwindcss` v4 — déjà configuré
- `@testing-library/react` + `vitest` — déjà configurés

### Dépendance dev optionnelle

- `svgo` — optimisation des SVG logos tiers (nettoyage métadonnées, minification). Installation : `pnpm add -D svgo`. Usage one-shot : `npx svgo src/assets/logos/*.svg --multipass`

### Vérification de sécurité

Avant de commencer :
```bash
cd apps/frontend && pnpm audit
```

Si des vulnérabilités sont détectées, les résoudre AVANT de commencer la refonte UI.

---

## 6. Checklist de Validation Grand Écran

Avant la démo Itecor, vérifier sur un écran externe ou projecteur :

- [ ] Ouvrir Chrome, zoom 150%
- [ ] Naviguer sur chaque page — vérifier que rien ne déborde
- [ ] Vérifier que les icônes Lucide sont nettes (pas pixelisées)
- [ ] Vérifier que le logo SVG est net
- [ ] Ouvrir une StoryDetailPage — vérifier que le radar chart est visible et lisible
- [ ] Vérifier que les labels du radar chart ne se chevauchent pas
- [ ] Vérifier que les couleurs score (vert/orange/rouge) sont distinguables sur projecteur
- [ ] Vérifier que la taille de police minimum (13px) est lisible à 3m de distance
- [ ] Faire le parcours démo complet 3 fois sans bug visuel
