# Spécification — TestForge UI Overhaul v1.0

> Refonte de l'interface utilisateur pour un rendu professionnel — Mars 2026
> Module complémentaire au spec-kit principal TestForge v2
> Objectif : passer de "side project propre" à "SaaS B2B crédible" avant la démo Itecor (début juin 2026)

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Personas & Contexte de Présentation](#2-personas--contexte-de-présentation)
3. [Epics & User Stories](#3-epics--user-stories)
4. [Features Détaillées](#4-features-détaillées)
5. [Flux Utilisateur](#5-flux-utilisateur)
6. [Wireframes](#6-wireframes)
7. [Exigences Non-Fonctionnelles](#7-exigences-non-fonctionnelles)

---

## 1. Vue d'Ensemble

### Problème

L'interface actuelle de TestForge est fonctionnellement complète mais souffre de plusieurs signaux visuels qui la classent comme "projet personnel" plutôt que "produit SaaS professionnel" :

- Navigation par emojis (📋 🔌 🤖 etc.) au lieu d'icônes vectorielles
- Logo textuel sans identité graphique propre
- Palette monochrome (blue-600 omniprésent, pas de couleur secondaire)
- Absence de hero visual sur la landing page
- Score d'analyse affiché en badge numérique brut — le différenciateur produit n'est pas visuellement mis en valeur
- Pas d'animations ni de transitions — l'interface est statique
- Aucune optimisation pour affichage grand écran / projecteur

Ces lacunes sont critiques : la démo Itecor début juin sera sur grand écran/projecteur devant des CTO et décideurs techniques. La première impression visuelle conditionne la crédibilité du produit.

### Solution

Refonte ciblée en 9 chantiers ordonnés par impact/effort. Aucune modification fonctionnelle — uniquement le rendu visuel, les interactions et la perception de professionnalisme.

### Périmètre

**Inclus (v1 — avant démo) :**
- Remplacement des emojis par icônes Lucide React
- Création d'un logo SVG wordmark
- Radar chart animé pour les scores d'analyse (5 dimensions)
- Logos officiels des providers tiers (LLM, sources, frameworks de test)
- Redesign de la sidebar (indicateur actif, micro-interactions, hiérarchie)
- Palette de couleurs étendue (couleur secondaire violet/indigo)
- Border-left coloré par score sur les story cards
- Sprint badge dans le header de page
- Optimisation grand écran (max-width, espacement, taille typo)

**Inclus (v1.1 — post-démo si temps) :**
- Landing page hero visual (screenshot produit animé)
- Code viewer amélioré avec tabs et coloration syntaxique enrichie
- Skeleton loaders et transitions d'état
- Animations d'entrée (fade-in, slide-up) sur les composants principaux

**Hors périmètre :**
- Refonte fonctionnelle (pas de changement d'API, de routes, de logique métier)
- Internationalisation (reste FR pour la démo)
- Dark mode (pas requis pour la démo)
- Responsive mobile (la démo est sur grand écran)

---

## 2. Personas & Contexte de Présentation

### Persona 1 — Claire (DSI Itecor, spectatrice démo)

| | |
|---|---|
| **Profil** | 45 ans, DSI, décideuse technique, peu de temps |
| **Besoin principal** | Évaluer en 5 min si le produit est assez mature pour son équipe |
| **Frustration** | Les "super outils" qui ressemblent à des POC quand on les ouvre |
| **Objectif** | Voir un produit fini, pas un prototype |
| **Fréquence d'usage** | 1 seule fois (la démo) — première impression = décision |

### Persona 2 — Sarah (QA Engineer, utilisatrice quotidienne)

| | |
|---|---|
| **Profil** | 30 ans, QA, utilise TestForge au quotidien |
| **Besoin principal** | Interface efficace et lisible pour trier les US et lancer les analyses |
| **Frustration** | Les emojis dans le menu font "pas sérieux" quand elle partage son écran en daily |
| **Objectif** | Être fière de montrer l'outil à son équipe |
| **Fréquence d'usage** | Quotidienne |

### Persona 3 — Marc (PO, utilisateur occasionnel)

| | |
|---|---|
| **Profil** | 35 ans, PO, consulte les scores de qualité des US |
| **Besoin principal** | Comprendre d'un coup d'œil la santé du backlog |
| **Frustration** | Le score numérique seul ne dit pas grand-chose visuellement |
| **Objectif** | Voir une représentation graphique parlante des forces/faiblesses de ses US |
| **Fréquence d'usage** | Hebdomadaire, avant le sprint planning |

### Contexte de présentation

- **Support :** Grand écran / projecteur (résolution 1920x1080 minimum)
- **Distance :** Audience à 2-5m de l'écran
- **Durée :** 15-20 minutes de démo live
- **Zoom probable :** 125-150% dans le navigateur
- **Contrainte critique :** Les emojis pixelisent à 150% de zoom, les SVG restent nets

---

## 3. Epics & User Stories

### Epic 1 — Identité Visuelle Professionnelle

> Remplacer tous les marqueurs visuels "amateur" par des éléments professionnels

#### US-UI-1.1 : Icônes de navigation Lucide

**En tant que** Sarah (QA), **je veux** voir des icônes vectorielles propres dans la navigation **afin de** ne pas avoir honte de partager mon écran en réunion.

**Critères d'acceptation :**
- [ ] Tous les emojis de la sidebar sont remplacés par des icônes Lucide React
- [ ] Les icônes ont une taille cohérente (16x16 ou 20x20)
- [ ] Les icônes héritent de la couleur du texte (active vs inactive)
- [ ] Aucune régression fonctionnelle sur la navigation
- [ ] Les icônes restent nettes à 150% de zoom navigateur

**Priorité :** 🔴 Haute — Impact perception maximal, effort minimal

**Mapping icônes :**

| Emoji actuel | Route | Icône Lucide |
|---|---|---|
| 📋 | /stories | `LayoutGrid` ou `ClipboardList` |
| 🕐 | /history | `Clock` |
| 🔌 | /settings/connections | `Plug` |
| 🤖 | /settings/llm | `Bot` |
| ↑ | /settings/git | `GitBranch` |
| 📄 | /settings/pom-templates | `FileCode` |
| 👥 | /settings/team | `Users` |
| 💳 | /settings/billing | `CreditCard` |
| 🛡 | /super-admin | `ShieldCheck` |

#### US-UI-1.2 : Logo SVG wordmark

**En tant que** Claire (DSI), **je veux** voir un logo graphique professionnel **afin de** percevoir un produit fini, pas un side project.

**Critères d'acceptation :**
- [ ] Le logo "🔧 TestForge" est remplacé par un SVG inline
- [ ] Le logo est un monogramme ou wordmark simple (pas de clipart)
- [ ] Le logo utilise les couleurs de la palette (blue-600 / indigo-500)
- [ ] Le logo est visible et lisible sur grand écran à 150% de zoom
- [ ] Le logo est réutilisé dans la landing page (navbar + hero)
- [ ] Le favicon est mis à jour avec une version icon-only du logo

**Priorité :** 🔴 Haute

### Epic 2 — Visualisation des Scores (Le Différenciateur)

> Transformer le score numérique brut en visualisation graphique mémorable

#### US-UI-2.1 : Radar chart animé des 5 dimensions

**En tant que** Marc (PO), **je veux** voir un radar chart des 5 dimensions de qualité **afin de** comprendre visuellement les forces et faiblesses de mes US.

**Critères d'acceptation :**
- [ ] Le radar chart affiche les 5 axes : clarté, complétude, testabilité, cas limites, critères AC
- [ ] Les scores sont normalisés sur une échelle 0-100
- [ ] Le polygon se remplit avec une animation d'entrée (du centre vers les valeurs) en 600-800ms
- [ ] Chaque sommet a un point/dot visible
- [ ] Les labels des axes sont lisibles (≥ 11px)
- [ ] Le fill du polygon est semi-transparent (15-20% opacité)
- [ ] Le stroke du polygon est net (1.5px)
- [ ] Les grilles concentriques de référence sont visibles mais discrètes
- [ ] Le radar est accompagné de barres de progression horizontales avec les valeurs numériques
- [ ] Le tout est responsive dans le conteneur de la StoryDetailPage
- [ ] Sur grand écran, le radar fait minimum 240x240px

**Priorité :** 🔴 Haute — C'est LE moment "wow" de la démo

#### US-UI-2.2 : Score badges colorés sur les story cards

**En tant que** Sarah (QA), **je veux** voir un indicateur visuel coloré sur chaque story card **afin de** repérer d'un coup d'œil les US problématiques.

**Critères d'acceptation :**
- [ ] Chaque story card a un border-left de 3px coloré selon le score
- [ ] Score > 70 → vert (#22c55e), 40-70 → orange (#f59e0b), < 40 → rouge (#ef4444)
- [ ] Le badge numérique inclut un dot coloré (●) avant le score
- [ ] Les US non analysées n'ont pas de border-left (ou gris neutre)
- [ ] Les couleurs sont cohérentes avec la sémantique globale de l'app

**Priorité :** 🔴 Haute

### Epic 3 — Sidebar & Navigation Professionnelle

> Passer d'une sidebar fonctionnelle à une sidebar premium

#### US-UI-3.1 : Redesign sidebar avec indicateurs actifs

**En tant que** Sarah (QA), **je veux** une sidebar avec des indicateurs visuels d'état actif **afin de** savoir instantanément où je suis dans l'app.

**Critères d'acceptation :**
- [ ] L'item actif a un accent-left de 3px (bleu) en plus du background
- [ ] L'item actif a un font-weight: 500 (vs 400 pour les inactifs)
- [ ] Les items ont un hover effect fluide (transition 150ms)
- [ ] Les labels de section ("Paramètres", "Admin") sont en uppercase tracking-wide 10px
- [ ] L'avatar utilisateur en bas utilise un gradient (pas un flat color)
- [ ] La sidebar a un subtle gradient de fond (white → gray-50 de haut en bas)
- [ ] Espacement vertical cohérent entre les sections

**Priorité :** 🟡 Moyenne

#### US-UI-3.2 : Header de page enrichi

**En tant que** Sarah (QA), **je veux** un header de page avec des métadonnées contextuelles **afin de** voir immédiatement le sprint actif et le nombre de stories.

**Critères d'acceptation :**
- [ ] Le titre de page inclut un badge sprint (pill bleu clair)
- [ ] Le sous-titre inclut : source (Jira/ADO) + projet + nombre de stories + nombre analysées
- [ ] Le header a un espacement suffisant pour être lisible sur grand écran

**Priorité :** 🟡 Moyenne

### Epic 4 — Palette de Couleurs Étendue

> Ajouter de la profondeur chromatique à l'interface

#### US-UI-4.1 : Système de couleurs secondaires

**En tant que** designer (moi), **je veux** une palette étendue avec des couleurs secondaires **afin de** différencier visuellement les contextes sans tout peindre en bleu.

**Critères d'acceptation :**
- [ ] Couleur secondaire : indigo-500 (#6366f1) pour les accents premium/Pro
- [ ] Couleur tertiaire : cyan-400 (#22d3ee) pour les highlights et les états interactifs
- [ ] Les variables CSS Tailwind sont configurées dans tailwind.config
- [ ] Les badges Pro utilisent la couleur secondaire (indigo)
- [ ] Les scores utilisent la palette sémantique (vert/orange/rouge), pas le bleu
- [ ] Le gradient avatar utilise blue → indigo

**Priorité :** 🟡 Moyenne

### Epic 5 — Optimisation Grand Écran

> S'assurer que l'app rend bien sur un projecteur 1080p à 150% de zoom

#### US-UI-5.1 : Layout adapté grand écran

**En tant que** présentateur (moi), **je veux** que l'app soit optimisée pour un affichage grand écran **afin que** la démo soit visuellement impactante.

**Critères d'acceptation :**
- [ ] Le conteneur principal a un max-width de 1200px pour les pages de contenu
- [ ] Les story cards ont un padding suffisant (min 12px vertical, 16px horizontal)
- [ ] Le radar chart se dimensionne proportionnellement (min 240px sur grand écran)
- [ ] La taille de police minimum est 13px (rien en dessous)
- [ ] Les espacement entre éléments augmentent sur grand écran (gap: 12px → 16px)
- [ ] La sidebar reste fixe (non scrollable sauf si trop d'items)
- [ ] Les boutons d'action (Analyser, Générer) sont suffisamment grands pour être visibles de loin

**Priorité :** 🟡 Moyenne

### Epic 6 — Landing Page (post-démo si temps)

#### US-UI-6.1 : Hero visual avec screenshot produit

**En tant que** visiteur de la landing page, **je veux** voir un aperçu visuel du produit **afin de** comprendre ce que je vais utiliser avant de m'inscrire.

**Critères d'acceptation :**
- [ ] Le hero section inclut un screenshot stylisé de l'app (StoryDetailPage avec radar chart)
- [ ] Le screenshot est dans un cadre navigateur stylisé (browser chrome)
- [ ] Le screenshot a un léger angle de perspective (transform: perspective + rotateY)
- [ ] Le screenshot est accompagné d'une ombre portée douce
- [ ] Le screenshot est responsive et ne casse pas sur des viewports < 1024px

**Priorité :** 🟢 Basse (post-démo)

### Epic 7 — Logos Providers Tiers

> Afficher les logos officiels des providers LLM, sources et frameworks pour un effet "écosystème intégré"

#### US-UI-7.1 : Logos providers LLM dans le sélecteur de configuration

**En tant que** Sarah (QA), **je veux** voir le logo de chaque provider LLM dans les réglages **afin de** identifier visuellement quel provider est configuré pour mon équipe.

**Critères d'acceptation :**
- [ ] Les logos officiels SVG sont affichés pour : OpenAI, Mistral AI, Ollama
- [ ] Un fallback icône Lucide `Bot` + nom texte est utilisé pour : Anthropic (Claude), Azure OpenAI
- [ ] Les logos sont rendus en 20x20 ou 24x24 dans le sélecteur/liste
- [ ] Les logos respectent les brand guidelines de chaque provider (pas de modification, clear space)
- [ ] Les logos sont nets à 150% de zoom navigateur (SVG)
- [ ] Un composant `ProviderLogo` centralise le rendu avec fallback automatique

**Priorité :** 🔴 Haute — Visible dès la config initiale et en démo

**Matrice de conformité marque :**

| Provider | Logo officiel | Source | Conditions |
|---|---|---|---|
| OpenAI | ✅ Autorisé | openai.com/brand | Badge "Powered by" encouragé pour clients API. Ne pas afficher plus gros que son propre logo |
| Anthropic (Claude) | ⚠️ Fallback texte | Pas de press kit public | Utiliser icône Lucide `Bot` + texte "Claude" |
| Mistral AI | ✅ Autorisé | mistral.ai/brand | Brand kit officiel disponible. Respecter couleurs/placement |
| Azure OpenAI | ⚠️ Fallback texte | microsoft.com/legal/trademarks | Guidelines strictes Microsoft. Icône Lucide `Cloud` + texte "Azure OpenAI" |
| Ollama | ✅ Open-source | GitHub repo | Projet MIT. Logo disponible dans le repo |

#### US-UI-7.2 : Logos sources (Jira, Azure DevOps) dans les connexions

**En tant que** Sarah (QA), **je veux** voir le logo Jira ou ADO à côté de ma connexion **afin de** repérer visuellement la source de mes user stories.

**Critères d'acceptation :**
- [ ] Le logo officiel Jira (SVG depuis atlassian.design) est affiché pour les connexions Jira
- [ ] Un fallback icône Lucide `GitPullRequest` + texte "Azure DevOps" est utilisé pour ADO
- [ ] Le logo apparaît dans : la liste des connexions, les story cards (source), le header de page
- [ ] Le logo Jira utilise le casing correct ("Jira", pas "JIRA")
- [ ] Le logo Jira n'est pas modifié (pas de changement de couleur, pas de crop)

**Priorité :** 🔴 Haute

**Matrice de conformité marque :**

| Source | Logo officiel | Source | Conditions |
|---|---|---|---|
| Jira | ✅ Autorisé | atlassian.design/logos | Usage marketing autorisé. Ne pas modifier. Ne pas impliquer un partenariat |
| Azure DevOps | ⚠️ Fallback texte | microsoft.com/legal/trademarks | Logo interdit sans licence. Nom texte autorisé pour indiquer compatibilité |
| Xray | ⚠️ Fallback texte | Pas de press kit public | Icône Lucide `TestTube2` + texte "Xray" |
| GitHub | ✅ Autorisé | github.com/logos | Press kit officiel. Octocat non modifiable |
| GitLab | ✅ Autorisé | about.gitlab.com/press | Press kit officiel avec SVG. Tanuki non modifiable |

#### US-UI-7.3 : Logos frameworks de test dans le sélecteur de génération

**En tant que** Sarah (QA), **je veux** voir le logo de chaque framework dans le sélecteur de génération **afin de** choisir visuellement le framework cible.

**Critères d'acceptation :**
- [ ] Le logo officiel Playwright (SVG depuis le repo Microsoft) est affiché
- [ ] Le logo officiel Selenium (SVG depuis selenium.dev) est affiché
- [ ] Le logo Cypress (SVG depuis cypress.io) est affiché
- [ ] Les logos sont rendus en 24x24 à côté du nom du framework
- [ ] Les logos sont accompagnés du nom texte (pas de logo seul)
- [ ] Les logos sont en version monochrome ou couleur selon le contexte (fond clair)

**Priorité :** 🟡 Moyenne — Visible uniquement dans le sélecteur de génération

**Matrice de conformité marque :**

| Framework | Logo officiel | Source | Conditions |
|---|---|---|---|
| Playwright | ✅ Open-source | playwright.dev (repo GitHub) | Apache 2.0. Logo public dans le repo |
| Selenium | ✅ Open-source | selenium.dev | Apache 2.0. Logo public |
| Cypress | ✅ Autorisé | cypress.io | Logo public, usage communautaire courant |

---

## 4. Features Détaillées

### F1 — Composant RadarChart

**Description :** Composant React réutilisable qui affiche un radar chart SVG des 5 dimensions de score d'analyse.

**Entrées :**
```typescript
interface RadarChartProps {
  scores: {
    clarity: number;       // 0-100
    completeness: number;  // 0-100
    testability: number;   // 0-100
    edgeCases: number;     // 0-100
    acceptanceCriteria: number; // 0-100
  };
  size?: number;            // pixels, défaut 240
  animated?: boolean;       // défaut true
  animationDuration?: number; // ms, défaut 800
}
```

**Sorties :** SVG inline avec polygon animé, grilles de référence, labels des axes, dots sur les sommets.

**Règles métier :**
- Les 5 axes sont équidistants (72° entre chaque)
- 3 grilles concentriques de référence (33%, 66%, 100%)
- L'animation part du centre et s'étend vers les valeurs finales
- Le fill est de la couleur primaire à 15% d'opacité
- Le stroke est de la couleur primaire à 100%
- Les labels sont positionnés à l'extérieur du polygone maximal

**Cas limites :**
- Score à 0 sur un axe → le point est au centre
- Tous les scores à 100 → polygon parfait (pentagone régulier)
- Tous les scores à 0 → point central (pas de polygon visible)
- Animation désactivée → affichage immédiat des valeurs finales

### F2 — Composant ScoreBadge

**Description :** Badge compact affichant un score numérique avec dot coloré sémantique.

**Entrées :**
```typescript
interface ScoreBadgeProps {
  score: number;          // 0-100
  showDot?: boolean;      // défaut true
  size?: 'sm' | 'md';    // défaut 'md'
}
```

**Sorties :** `<span>` avec dot coloré + score numérique, background léger teinté.

**Règles métier :**
- Score > 70 → vert (bg: #E6F9E6, text: #1a7a1a, dot: #22c55e)
- Score 40-70 → orange (bg: #FFF3E0, text: #b86800, dot: #f59e0b)
- Score < 40 → rouge (bg: #FFE8E8, text: #c43030, dot: #ef4444)
- Taille sm = text-xs, padding réduit. Taille md = text-sm, padding standard.

### F3 — Composant ScoreBarChart

**Description :** Barres de progression horizontales accompagnant le radar chart, avec labels et valeurs numériques.

**Entrées :**
```typescript
interface ScoreBarChartProps {
  scores: RadarChartProps['scores'];
}
```

**Sorties :** Liste de 5 barres avec label (dimension), barre colorée proportionnelle, et valeur numérique.

**Règles métier :**
- Même code couleur que ScoreBadge pour chaque dimension individuelle
- La barre a un background gris clair (track) et un fill coloré (valeur)
- Les labels sont alignés à gauche, les valeurs à droite
- La largeur de la barre est proportionnelle à la valeur (0% → 100%)

### F4 — Composant ProviderLogo

**Description :** Composant React centralisé qui affiche le logo officiel d'un provider tiers ou un fallback icône Lucide + texte si le logo n'est pas disponible.

**Entrées :**
```typescript
type LogoProvider =
  // LLM
  | 'openai' | 'anthropic' | 'mistral' | 'azure_openai' | 'ollama'
  // Sources
  | 'jira' | 'azure_devops' | 'xray' | 'github' | 'gitlab' | 'azure_repos'
  // Frameworks
  | 'playwright' | 'selenium' | 'cypress';

interface ProviderLogoProps {
  provider: LogoProvider;
  size?: number;            // pixels, défaut 20
  showLabel?: boolean;      // défaut false — affiche le nom texte à côté
  className?: string;
}
```

**Sorties :** `<span>` contenant soit un SVG inline (logo officiel), soit une icône Lucide + texte (fallback).

**Règles métier :**
- Les SVG officiels sont stockés dans `assets/logos/` et importés statiquement
- Chaque logo a une version monochrome (pour les contextes neutres) et couleur (pour les mises en avant)
- Le fallback utilise une icône Lucide sémantique : `Bot` pour les LLM, `Plug` pour les sources, `TestTube2` pour les frameworks
- Le composant ne fait AUCUN fetch réseau — tous les logos sont des assets statiques bundlés
- Les logos respectent les proportions originales (pas de stretch)
- Le composant exporte aussi un helper `getProviderDisplayName(provider)` pour le nom lisible

**Cas limites :**
- Provider inconnu → icône Lucide `HelpCircle` + provider en texte
- size=0 → composant non rendu (return null)
- showLabel=true avec logo officiel → logo + texte côte à côte
- showLabel=true avec fallback → icône + texte (même rendu)

**Inventaire des assets SVG à intégrer :**

| Provider | Type | Asset | Taille fichier estimée |
|---|---|---|---|
| OpenAI | SVG officiel | Logomark (fleur/blossom) noir | ~2KB |
| Mistral AI | SVG officiel | Logomark (M géométrique) | ~1KB |
| Ollama | SVG officiel | Logomark (llama) | ~3KB |
| Jira | SVG officiel | Logomark (triangle bleu) | ~1KB |
| GitHub | SVG officiel | Octocat silhouette | ~2KB |
| GitLab | SVG officiel | Tanuki (renard) | ~3KB |
| Playwright | SVG officiel | Masques théâtre | ~4KB |
| Selenium | SVG officiel | Se logo | ~2KB |
| Cypress | SVG officiel | Logo C | ~1KB |
| **Total** | | **9 SVGs** | **~19KB** |

**Impact bundle :** ~19KB de SVGs statiques — négligeable. Pas de lib externe ajoutée.

---

## 5. Flux Utilisateur

### Flux principal — Analyse d'une US (avec nouveau rendu visuel)

1. Sarah ouvre la liste des User Stories
2. Elle voit les story cards avec border-left coloré et score badges
3. Elle clique sur une US avec un score orange (54)
4. La StoryDetailPage s'affiche avec le radar chart qui s'anime (800ms)
5. Sarah identifie visuellement que "cas limites" et "critères AC" sont faibles
6. Elle consulte les barres de progression pour les valeurs exactes
7. Elle lit les suggestions de l'IA pour améliorer ces dimensions
8. **Résultat :** Sarah comprend en 2 secondes les faiblesses de l'US

### Flux de démo — Scénario projecteur

1. Présentateur ouvre l'app sur grand écran (1080p, zoom 150%)
2. La sidebar avec icônes Lucide et logo SVG donne une première impression pro
3. Il montre la liste des US avec les badges colorés → "scan visuel instantané"
4. Il clique sur une US → le radar chart s'anime → **moment wow**
5. Il montre les suggestions → "l'IA explique pourquoi"
6. Il lance la génération → le code viewer s'affiche avec POM structuré
7. **Résultat :** L'audience perçoit un produit fini et différenciant

---

## 6. Wireframes

### StoryDetailPage — Section Analyse (après refonte)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo SVG] TestForge                        [Sprint 12]        │
├──────────┬───────────────────────────────────────────────────────┤
│ [icon]   │                                                      │
│ Stories  │  ALPHA-142 — Connexion via SSO            Score: 82  │
│ [icon]   │  ──────────────────────────────────────────────────── │
│ History  │                                                      │
│          │  ┌────── Radar ──────┐  ┌──── Barres ──────────────┐ │
│ PARAMS   │  │                   │  │ Clarté     ████████░░  82│ │
│ [icon]   │  │     Clarté        │  │ Complétude █████░░░░░  52│ │
│ Connect  │  │    ╱      ╲       │  │ Testabilité████████░░  82│ │
│ [icon]   │  │  AC ──●── Comp    │  │ Cas limites██████░░░░  60│ │
│ LLM      │  │    ╲      ╱       │  │ Critères AC██████░░░░  66│ │
│ [icon]   │  │    Edge  Test     │  │                          │ │
│ Git      │  │                   │  │ Score global: 82/100     │ │
│ [icon]   │  └───────────────────┘  └──────────────────────────┘ │
│ POM      │                                                      │
│ [icon]   │  Suggestions (3)                                     │
│ Team     │  ┌──────────────────────────────────────────────────┐ │
│ [icon]   │  │ 🔴 Critère AC #2 manque de précision...         │ │
│ Billing  │  │ 🟡 Pas de cas limite pour timeout...            │ │
│          │  │ 🟢 Ajouter un scénario de rollback...           │ │
│ ───────  │  └──────────────────────────────────────────────────┘ │
│ [avatar] │                                                      │
│ sarah@   │  [Bouton: Générer les tests]   [Bouton: Writeback]  │
└──────────┴───────────────────────────────────────────────────────┘
```

---

## 7. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Radar chart rendu en < 100ms (SVG inline, pas de lib externe lourde) |
| Performance | Pas de librairie de charting externe (pas de Recharts, pas de Chart.js) — SVG pur |
| Rendu | Tous les éléments visuels nets à 150% de zoom navigateur |
| Rendu | Police minimum 13px dans l'app, 11px pour les labels secondaires |
| Accessibilité | Les couleurs sémantiques (vert/orange/rouge) ne sont pas le seul indicateur — le score numérique est toujours visible |
| Compatibilité | Chrome + Firefox dernières 2 versions (la démo sera sur Chrome) |
| Bundle size | lucide-react importé en tree-shaking (pas d'import wildcard) |
| Maintenabilité | Chaque composant visuel est dans son propre fichier sous components/ |
| Tests | Chaque nouveau composant a un test unitaire Vitest (render + snapshot) |
