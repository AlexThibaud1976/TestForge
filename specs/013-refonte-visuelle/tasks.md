# Checklist d'Implémentation — TestForge UI Overhaul

> Dernière mise à jour : Mars 2026
> Voir spec.md pour les user stories, plan.md pour les détails techniques.
> Règle absolue : test-first sur chaque composant. Pas de code sans test qui fail d'abord.

---

## Phase 1 : Fondations & Palette (2-3h)

> Objectif : poser le socle de couleurs et utilitaires avant de toucher les composants

### Audit & sécurité
- [ ] Exécuter `pnpm audit` dans apps/frontend — corriger les vulnérabilités avant tout changement
- [ ] Vérifier que `lucide-react` est bien dans les dépendances (sinon `pnpm add lucide-react`)
- [ ] Vérifier la version de `lucide-react` — mettre à jour si < 0.300 (`pnpm up lucide-react`)

### Palette & thème
- [ ] TESTER : écrire `theme.test.ts` — vérifier `getScoreLevel(0)=low`, `getScoreLevel(40)=medium`, `getScoreLevel(71)=high`, frontières exactes
- [ ] IMPLÉMENTER : créer `components/ui/theme.ts` avec SCORE_COLORS, BRAND, getScoreLevel()
- [ ] TESTER : vérifier que les couleurs SCORE_COLORS sont des hex valides (regex test)
- [ ] Configurer les couleurs secondaires dans tailwind.config (indigo-500, cyan-400 si pas déjà présents)

### Icônes centralisées
- [ ] Créer `components/ui/icons.ts` avec re-exports Lucide (tree-shaking)
- [ ] Vérifier le tree-shaking : `pnpm build` → noter la taille du bundle avant/après

**✅ Fin Phase 1 : palette testée, icônes prêtes, aucun changement visuel encore**

---

## Phase 2 : Composants Visuels — Test-First (4-5h)

> Objectif : créer les 4 nouveaux composants avec tests complets AVANT de les brancher

### ScoreBadge
- [ ] TESTER : écrire `ScoreBadge.test.tsx` — render avec score=82 → classe verte, score=54 → orange, score=28 → rouge
- [ ] TESTER : vérifier présence du dot quand showDot=true, absence quand false
- [ ] TESTER : vérifier les frontières score=70 et score=40 (comportement exact)
- [ ] IMPLÉMENTER : créer `components/ui/ScoreBadge.tsx`
- [ ] Snapshot test : capturer le rendu pour détection régression future

### RadarChart
- [ ] TESTER : écrire `RadarChart.test.tsx` — render SVG présent, 5 labels affichés
- [ ] TESTER : vérifier que les scores sont reflétés dans les points du polygon (calcul trigonométrique)
- [ ] TESTER : cas limite scores tous à 0 → polygon dégénéré au centre
- [ ] TESTER : cas limite scores tous à 100 → pentagone régulier
- [ ] TESTER : animated=false → pas d'élément `<animate>` dans le SVG
- [ ] IMPLÉMENTER : créer `components/ui/RadarChart.tsx`
- [ ] Snapshot test

### ScoreBarChart
- [ ] TESTER : écrire `ScoreBarChart.test.tsx` — 5 barres rendues avec les bons labels
- [ ] TESTER : vérifier que la largeur de chaque barre est proportionnelle au score
- [ ] TESTER : vérifier les couleurs par tranche (utilise getScoreLevel)
- [ ] IMPLÉMENTER : créer `components/ui/ScoreBarChart.tsx`
- [ ] Snapshot test

### Logo
- [ ] TESTER : écrire `Logo.test.tsx` — SVG présent, texte "TestForge" visible quand showText=true
- [ ] TESTER : showText=false → pas de texte
- [ ] TESTER : size prop respectée (vérifier attribut width/height du SVG)
- [ ] IMPLÉMENTER : créer `components/ui/Logo.tsx` — SVG inline wordmark
- [ ] Créer le favicon à partir du logo (version icon-only 32x32)

### ProviderLogo (logos providers tiers)
- [ ] Créer le dossier `src/assets/logos/`
- [ ] Télécharger les 9 SVGs officiels depuis les sources autorisées :
  - [ ] OpenAI (openai.com/brand → logomark blossom)
  - [ ] Mistral AI (mistral.ai/brand → logomark M)
  - [ ] Ollama (GitHub repo → llama icon)
  - [ ] Jira (atlassian.design/logos → logomark triangle bleu)
  - [ ] GitHub (github.com/logos → Octocat silhouette)
  - [ ] GitLab (about.gitlab.com/press → tanuki)
  - [ ] Playwright (playwright.dev repo → masques théâtre)
  - [ ] Selenium (selenium.dev → Se logo)
  - [ ] Cypress (cypress.io → C logo)
- [ ] Optimiser les SVGs : `npx svgo src/assets/logos/*.svg --multipass`
- [ ] Vérifier que chaque SVG < 5KB après optimisation
- [ ] TESTER : écrire `ProviderLogo.test.tsx` — logo SVG affiché pour 'openai'
- [ ] TESTER : fallback icône Lucide + texte pour 'anthropic' (pas de logo)
- [ ] TESTER : fallback icône Lucide + texte pour 'azure_openai' (pas de logo)
- [ ] TESTER : fallback icône Lucide + texte pour 'azure_devops' (pas de logo)
- [ ] TESTER : fallback icône Lucide + texte pour 'xray' (pas de logo)
- [ ] TESTER : provider inconnu → fallback HelpCircle + texte
- [ ] TESTER : showLabel=true → label texte visible même avec logo
- [ ] TESTER : size prop respectée
- [ ] IMPLÉMENTER : créer `components/ui/ProviderLogo.tsx` avec registry + fallback
- [ ] Snapshot test

**✅ Fin Phase 2 : 5 composants créés et testés, 9 logos providers prêts, pas encore branchés dans l'app**

---

## Phase 3 : Intégration — Sidebar & Navigation (2-3h)

> Objectif : brancher les composants dans AppLayout — le changement le plus visible

### Sidebar
- [ ] TESTER : écrire/mettre à jour `AppLayout.test.tsx` — vérifier qu'AUCUN emoji n'est dans le DOM rendu
- [ ] TESTER : vérifier que chaque icône Lucide est présente (par aria-label ou data-testid)
- [ ] TESTER : vérifier que l'item actif a la classe d'accent (border-left ou indicateur)
- [ ] MODIFIER : `AppLayout.tsx` — remplacer le tableau navSections emojis par icônes Lucide
- [ ] MODIFIER : remplacer le span logo emoji par `<Logo />`
- [ ] MODIFIER : ajouter l'indicateur actif (border-left 3px blue, font-weight 500)
- [ ] MODIFIER : gradient avatar (from-indigo-500 to-blue-500)
- [ ] MODIFIER : gradient subtil fond sidebar (optionnel, white → gray-50)
- [ ] VÉRIFIER : navigation fonctionne toujours sur toutes les routes
- [ ] VÉRIFIER : la super admin section est bien conditionnelle (pas visible si pas admin)

### Header de page
- [ ] MODIFIER : StoriesListPage — ajouter badge sprint (pill) + métadonnées sous-titre
- [ ] VÉRIFIER : le sous-titre affiche source + projet + count stories + count analysées

**✅ Fin Phase 3 : l'app a un look professionnel dans la navigation**

---

## Phase 4 : Intégration — Scores, Story Cards & Logos Providers (4-5h)

> Objectif : brancher le radar chart, les badges et les logos providers dans les pages fonctionnelles

### Story Cards
- [ ] TESTER : écrire/mettre à jour test StoryCard — vérifier border-left coloré selon score
- [ ] TESTER : vérifier que ScoreBadge est rendu (pas le badge numérique brut)
- [ ] TESTER : US non analysée → pas de border-left (ou gris neutre)
- [ ] TESTER : vérifier que le ProviderLogo de la source (Jira/ADO) est affiché sur la card
- [ ] MODIFIER : composant StoryCard → intégrer ScoreBadge + border-left conditionnel
- [ ] MODIFIER : ajouter `<ProviderLogo provider={connection.type} size={16} />` sur chaque card

### StoryDetailPage — Section Analyse
- [ ] TESTER : mettre à jour `StoryDetailPage.test.tsx` — vérifier présence RadarChart quand analyse disponible
- [ ] TESTER : vérifier présence ScoreBarChart à côté du radar
- [ ] TESTER : vérifier que le score global reste affiché en heading
- [ ] MODIFIER : `StoryDetailPage.tsx` — layout flex (radar gauche + barres droite)
- [ ] MODIFIER : intégrer `<RadarChart scores={...} />` et `<ScoreBarChart scores={...} />`
- [ ] VÉRIFIER : le radar chart s'anime correctement au chargement
- [ ] VÉRIFIER : les labels du radar ne se chevauchent pas sur différentes tailles d'écran

### Logos providers — Intégration dans les pages existantes
- [ ] MODIFIER : Page config LLM (`/settings/llm`) — ajouter `<ProviderLogo>` à côté de chaque provider dans la liste/sélecteur
- [ ] MODIFIER : Page connexions (`/settings/connections`) — ajouter logo Jira ou fallback ADO à côté de chaque connexion
- [ ] MODIFIER : Sélecteur framework (FrameworkSelector) — ajouter logos Playwright/Selenium/Cypress à côté des noms
- [ ] MODIFIER : Page config Git (`/settings/git`) — ajouter logos GitHub/GitLab ou fallback Azure Repos
- [ ] VÉRIFIER : tous les logos sont nets à 150% de zoom
- [ ] VÉRIFIER : les fallback Lucide+texte sont visuellement cohérents avec les vrais logos (même alignement, même taille)
- [ ] VÉRIFIER : aucun logo ne dépasse sa zone (pas de débordement, pas de stretch)

**✅ Fin Phase 4 : le coeur visuel du produit est en place avec l'écosystème de logos — démo-ready minimum**

---

## Phase 5 : Polish & Optimisation Grand Écran (2-3h)

> Objectif : affiner pour le rendu projecteur

### Palette étendue
- [ ] Appliquer couleur secondaire indigo sur les badges "Pro" (si existants)
- [ ] Vérifier cohérence des couleurs score dans toute l'app (pas de bleu pour les scores)
- [ ] Vérifier que les couleurs vert/orange/rouge sont distinguables (simuler daltonisme)

### Grand écran
- [ ] Ajouter max-width: 1200px sur le conteneur principal des pages de contenu
- [ ] Vérifier padding/gap suffisants à 150% zoom
- [ ] Vérifier taille minimum de police 13px partout
- [ ] Vérifier que le radar chart fait min 240px sur grand écran
- [ ] Vérifier que les boutons d'action sont suffisamment grands

### Landing page (ajustements v1)
- [ ] Remplacer "🔧 TestForge" dans la navbar landing par `<Logo />`
- [ ] Mettre à jour la section pricing avec la palette secondaire pour le badge "Recommandé"
- [ ] Mettre à jour le favicon dans index.html

### Documentation
- [ ] Mettre à jour le README avec les nouveaux composants UI
- [ ] Documenter la palette de couleurs (theme.ts) dans le README ou un guide dédié
- [ ] Ajouter des commentaires JSDoc sur les props de RadarChart, ScoreBadge, etc.

**✅ Fin Phase 5 : app visuellement professionnelle et prête pour la démo**

---

## Phase 6 : Landing Page Hero Visual (v1.1 — si temps, 4-5h)

> Objectif : hero section avec screenshot produit — uniquement si les phases 1-5 sont terminées

### Hero visual
- [ ] TESTER : écrire test LandingPage — vérifier présence d'un élément hero-visual
- [ ] Capturer un screenshot de la StoryDetailPage avec radar chart (PNG haute résolution)
- [ ] Créer un composant HeroVisual avec cadre navigateur stylisé (CSS)
- [ ] Ajouter la perspective CSS (transform: perspective + rotateY léger)
- [ ] Ajouter une ombre portée douce
- [ ] Intégrer dans la section hero de LandingPage

### Animations d'entrée (optionnel)
- [ ] Ajouter fade-in + slide-up sur les story cards au chargement de la liste
- [ ] Ajouter skeleton loaders sur les zones de chargement (analyse en cours, génération en cours)
- [ ] Ajouter transition sur le changement d'onglet analyse/génération

**✅ Fin Phase 6 : landing page avec hero visual impressionnant**

---

## Régression & Validation Finale

> À exécuter APRÈS chaque phase et obligatoirement avant la démo

- [ ] `pnpm typecheck` — zéro erreur TypeScript
- [ ] `pnpm lint` — zéro warning ESLint
- [ ] `pnpm test` — tous les tests passent (anciens + nouveaux)
- [ ] `pnpm build` — build réussi, taille bundle raisonnable (delta < 50KB vs avant)
- [ ] Navigation complète : chaque route fonctionne (stories, detail, history, settings/*)
- [ ] Aucun emoji restant dans le DOM (grep dans le code source)
- [ ] Vérification visuelle sur écran externe / zoom 150%
- [ ] Parcours démo complet 3 fois sans accroc

---

> 📊 Progression : 0 / 108 tâches complétées
> 🎯 Phases 1-4 = démo-ready minimum (~15-19h)
> 🏆 Phases 1-5 = démo professionnelle (~17-22h)
> 🚀 Phases 1-6 = version complète (~21-27h)
