# Spécification — TestForge : Historique Arborescent avec Filtres

> Refondre la page Historique en vue arborescente Connexion → US → Générations, avec filtre par connexion et correction des bugs existants.
> Spécification détaillée — 2026-03-26

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Personas](#2-personas)
3. [Epics & User Stories](#3-epics--user-stories)
4. [Features Détaillées](#4-features-détaillées)
5. [Flux Utilisateur](#5-flux-utilisateur)
6. [Modèles de Données](#6-modèles-de-données)
7. [Wireframes](#7-wireframes)
8. [Exigences Non-Fonctionnelles](#8-exigences-non-fonctionnelles)

---

## 1. Vue d'Ensemble

### Problème

La page Historique actuelle affiche une liste plate de générations sans contexte. Le screenshot montre les problèmes :
- Chaque ligne ne montre qu'un UUID tronqué (`a36d9935`, `0671933e`…) — aucun titre de US, aucune indication du projet source
- "Playwright · TypeScript" est affiché en dur alors que le framework/language réels sont disponibles dans les données (`gen.framework`, `gen.language`)
- Le bouton "Voir US" renvoie vers `/stories` (la liste complète) au lieu de la story spécifique liée à la génération
- Quand un client a 3 projets et 50+ générations, c'est impossible de retrouver les tests d'un projet spécifique

### Solution

Refondre la page en vue arborescente collapsible : **Connexion (projet) → User Story → Générations**. Ajouter un filtre par connexion (réutilisable depuis P1). Corriger les deux bugs d'affichage.

### Périmètre

**Inclus :**
- Vue arborescente à 3 niveaux : Connexion → US → Générations (collapsible)
- Filtre dropdown par connexion source (même composant que P1 `ConnectionFilter` via le hook `useConnectionFilter`)
- Correction bug : afficher `gen.framework` + `gen.language` dynamiquement
- Correction bug : "Voir US" navigue vers `/stories/{userStoryId}` au lieu de `/stories`
- Nouveau endpoint API `GET /api/generations/history` avec join enrichi
- Le compteur "X générations" reflète le total filtré

**Hors périmètre :**
- Filtres framework/langage, statut, plage de dates (P2 post-démo)
- Pagination (50 max suffit pour la démo)
- Suppression de générations
- Export CSV de l'historique

---

## 2. Personas

### Persona 1 — Sophie (QA Lead)

| | |
|---|---|
| **Profil** | 35 ans, gère les tests de 3 projets |
| **Besoin principal** | Retrouver rapidement les tests générés pour un projet spécifique |
| **Frustration** | 50 lignes d'UUIDs sans contexte, impossible de savoir quel test vient de quel projet |
| **Objectif** | Vue claire "Projet → Story → Tests" avec filtre rapide |
| **Fréquence d'usage** | 2-3 fois par semaine |

### Persona 2 — Marc (Tech Lead)

| | |
|---|---|
| **Profil** | 40 ans, supervise la qualité du code généré |
| **Besoin principal** | Re-télécharger les tests d'une US précise après modification du repo |
| **Frustration** | Doit se souvenir de l'UUID de la génération, pas de lien vers l'US |
| **Objectif** | Clic sur l'US → voir ses générations → télécharger le ZIP |
| **Fréquence d'usage** | Hebdomadaire |

---

## 3. Epics & User Stories

### Epic 1 — Vue arborescente de l'historique

> Transformer l'historique plat en vue hiérarchique Connexion → US → Générations.

#### US-1.1 : Regroupement par connexion et user story

**En tant que** Sophie (QA Lead), **je veux** voir l'historique regroupé par projet (connexion) puis par user story **afin de** retrouver instantanément les tests générés pour un projet donné.

**Critères d'acceptation :**
- [ ] L'historique est structuré en arbre à 3 niveaux : Connexion → US → Générations
- [ ] Le niveau 1 (Connexion) affiche le nom + icône type (🔵 Jira, 🟣 ADO) + nombre d'US
- [ ] Le niveau 2 (US) affiche `externalId` + titre + nombre de générations
- [ ] Le niveau 3 (Génération) affiche statut, framework, language, provider, durée, date, boutons ZIP/Voir US
- [ ] Chaque niveau est collapsible (toggle open/close) avec animation douce
- [ ] Par défaut, le premier niveau connexion est ouvert, les autres sont fermés
- [ ] Les générations sans US associée (edge case) apparaissent dans un groupe "Non liées"

**Priorité :** 🔴 Haute

#### US-1.2 : Filtre par connexion dans l'historique

**En tant que** Sophie (QA Lead), **je veux** filtrer l'historique par connexion source **afin de** ne voir que les générations du projet sur lequel je travaille.

**Critères d'acceptation :**
- [ ] Un dropdown "Projet" identique à celui de la page Stories est présent en haut de la page
- [ ] Sélectionner une connexion ne montre que l'arbre de cette connexion
- [ ] Le compteur de générations se met à jour
- [ ] Le filtre est persisté dans l'URL (`?connectionId=xxx`) pour être partageable
- [ ] Le hook `useConnectionFilter` de P1 est réutilisé (pas de duplication)

**Priorité :** 🔴 Haute

### Epic 2 — Corrections de bugs existants

> Corriger les deux bugs identifiés dans la page Historique actuelle.

#### US-2.1 : Affichage dynamique du framework et langage

**En tant que** Marc (Tech Lead), **je veux** voir le framework et le langage réels de chaque génération **afin de** distinguer les tests Playwright/TypeScript des tests Selenium/Java.

**Critères d'acceptation :**
- [ ] L'affichage utilise `gen.framework` et `gen.language` (capitalize) au lieu de la chaîne hardcodée
- [ ] Format : "Playwright · TypeScript", "Selenium · Java", "Cypress · JavaScript", etc.

**Priorité :** 🔴 Haute (bug)

#### US-2.2 : Navigation "Voir US" vers la bonne story

**En tant que** Marc (Tech Lead), **je veux** que le bouton "Voir US" m'emmène directement vers la page de détail de la story associée **afin de** pouvoir relancer une analyse ou génération.

**Critères d'acceptation :**
- [ ] Le bouton navigue vers `/stories/{userStoryId}` au lieu de `/stories`
- [ ] Si la US n'existe plus (supprimée/désyncée), le bouton est grisé avec tooltip "US non disponible"
- [ ] Le `userStoryId` est récupéré via l'analyse liée à la génération

**Priorité :** 🔴 Haute (bug)

---

## 4. Features Détaillées

### F1 — Vue arborescente collapsible

**Description :** L'historique affiche un arbre à 3 niveaux. Chaque niveau est un composant React collapsible. Les données sont structurées côté frontend à partir d'un endpoint API enrichi.

**Entrées :** Endpoint `GET /api/generations/history` qui retourne les générations avec join sur analyses → userStories → sourceConnections.

**Sorties :** Arbre visuel groupé par connexion, puis par US, avec les générations comme feuilles.

**Règles métier :**
- Tri niveau 1 (connexion) : alphabétique par nom
- Tri niveau 2 (US) : par date de dernière génération (plus récente en premier)
- Tri niveau 3 (génération) : par date décroissante (plus récente en premier)
- Générations dont l'analyse n'a pas de `userStoryId` → groupe spécial "Non liées" en fin de liste
- Générations dont la connexion est supprimée → groupe "Projet supprimé" grisé

**Cas limites :**
- 0 générations → message vide actuel conservé
- 1 seule connexion → l'arbre est quand même affiché (pas de shortcut flat)
- US avec 10+ générations → toutes affichées (pas de pagination interne, max 50 total)

### F2 — Endpoint API enrichi

**Description :** Nouveau endpoint `GET /api/generations/history` qui retourne les générations avec les métadonnées US et connexion nécessaires au regroupement frontend.

**Entrées :** `teamId` (JWT), optionnel `connectionId` (query param).

**Sorties :** Array de générations enrichies avec `userStoryTitle`, `userStoryExternalId`, `userStoryId`, `connectionId`, `connectionName`, `connectionType`.

**Règles métier :**
- L'endpoint fait un join LEFT : `generations → analyses → userStories → sourceConnections`
- Les champs connexion/US sont nullable (génération orpheline possible)
- Limité à 50 résultats, tri par date desc
- Filtrage par `connectionId` appliqué au niveau du join sur `userStories.connectionId`

---

## 5. Flux Utilisateur

### Flux principal — Consulter l'historique par projet

1. L'utilisateur arrive sur la page Historique
2. Le système charge les générations enrichies et construit l'arbre
3. L'arbre s'affiche : les connexions sont des headers collapsibles, la première est ouverte
4. L'utilisateur déplie une connexion → voit les US de ce projet
5. L'utilisateur déplie une US → voit ses générations avec statut, framework, durée
6. L'utilisateur clique "⬇ ZIP" → téléchargement direct
7. L'utilisateur clique "Voir US" → navigation vers `/stories/{id}`
8. **Résultat :** L'utilisateur a retrouvé et re-téléchargé les tests d'une US spécifique

### Flux alternatif — Filtrer par connexion

1. L'utilisateur sélectionne "Backend API (Jira)" dans le dropdown
2. Le système filtre l'arbre : seule la connexion sélectionnée est visible
3. Le compteur se met à jour ("8 générations")
4. L'URL passe à `?connectionId=xxx`
5. **Résultat :** Vue focalisée sur un seul projet

### Flux alternatif — Génération orpheline

1. Le système détecte des générations sans US associée (analyse supprimée ou manuelle)
2. Ces générations apparaissent dans un groupe "Non liées" en fin d'arbre
3. Le bouton "Voir US" est grisé pour ces entrées
4. **Résultat :** Pas de crash, l'historique reste complet

---

## 6. Modèles de Données

### Nouveau type frontend (response de l'API enrichie)

```typescript
interface GenerationHistoryItem {
  // Champs génération existants
  id: string;
  analysisId: string | null;
  framework: string;
  language: string;
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  status: string;
  durationMs: number | null;
  createdAt: string;
  // Champs enrichis (join)
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
}

// Structure arborescente construite côté frontend
interface ConnectionGroup {
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
  stories: StoryGroup[];
}

interface StoryGroup {
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  generations: GenerationHistoryItem[];
}
```

### Aucune modification du schéma DB

Toutes les relations existent déjà : `generations.analysisId → analyses.userStoryId → userStories.connectionId → sourceConnections`. Le nouvel endpoint fait un JOIN, pas un changement de schema.

---

## 7. Wireframes

### Vue arborescente (état par défaut)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Historique    [Projet ▾]                                            │
│  23 générations                                                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ 🔵 Backend API (Jira)                           12 générations   │
│  │                                                                   │
│  │  ▼ TF-42 · Connexion utilisateur avec email         3 générations│
│  │  │  ┌─────────────────────────────────────────────────────────┐   │
│  │  │  │ ✓ Succès  Playwright · TypeScript  anthropic  47s      │   │
│  │  │  │ 25/03/2026 23:03           [Voir US] [⬇ ZIP]          │   │
│  │  │  └─────────────────────────────────────────────────────────┘   │
│  │  │  ┌─────────────────────────────────────────────────────────┐   │
│  │  │  │ ✓ Succès  Selenium · Java  openai  35s                 │   │
│  │  │  │ 25/03/2026 21:40           [Voir US] [⬇ ZIP]          │   │
│  │  │  └─────────────────────────────────────────────────────────┘   │
│  │  │                                                                │
│  │  ► TF-43 · Réinitialisation du mot de passe         2 générations│
│  │  ► TF-44 · Ajouter un produit au panier             1 génération │
│  │                                                                   │
│  ► 🟣 Mobile App (ADO)                              8 générations   │
│  ► 🔵 Frontend React (Jira)                         3 générations   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Légende des états collapsibles

```
▼ = ouvert (contenu visible)
► = fermé (contenu masqué, clic pour ouvrir)
```

---

## 8. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Chargement initial < 2s (1 requête API, structuration client-side) |
| UX | Animation de collapse/expand fluide (transition CSS 150ms) |
| Accessibilité | Niveaux arborescents navigables au clavier (Tab + Enter pour toggle) |
| Rétrocompatibilité | L'ancien endpoint `GET /api/generations` reste inchangé (pas de breaking change) |
| Cohérence | Le dropdown connexion utilise le même hook que la page Stories (P1) |

---

> 📎 **Dépendance P1 :** Le hook `useConnectionFilter` et le composant `ConnectionFilter` doivent être implémentés (feature 002-p1-project-filter) avant cette feature.
> 📎 **Dépendance plan.md :** Voir plan.md pour le nouvel endpoint API et la stratégie de test.
