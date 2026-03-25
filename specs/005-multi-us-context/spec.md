# Feature Specification: Multi-US Context (Shared POM)

**Feature Branch**: `005-multi-us-context`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Quand TestForge génère des tests pour plusieurs US du même projet, les Page Objects déjà générés doivent être réutilisés au lieu d'être recréés à chaque fois. US-42 "Login" génère `LoginPage.page.ts` → US-43 "Mon profil" réutilise `LoginPage` et génère `ProfilePage.page.ts` en plus. Le code passe de "démo isolée" à "projet cohérent".

### Problème

Chaque génération est indépendante : le LLM ne sait pas que `LoginPage.page.ts` existe déjà. Il le recrée à chaque US qui implique un login. Résultat : N copies du même Page Object avec des signatures différentes, impossibles à merger dans un vrai projet.

### Solution

Maintenir un "contexte projet" par équipe : un registre des Page Objects déjà générés (nom de classe, fichier, méthodes publiques). Ce contexte est injecté dans le prompt de génération pour que le LLM réutilise les POM existants.

---

## User Stories

### US-MC-1 — Réutilisation automatique des POM existants (Priority: P1)

Sarah génère des tests pour US-43 "Mon profil". Le login est un prérequis. TestForge détecte que `LoginPage.page.ts` a déjà été généré pour US-42 et l'injecte dans le prompt. Le code généré pour US-43 fait un `import { LoginPage } from '../pages/LoginPage.page'` au lieu de recréer la classe.

**Independent Test**: Générer tests pour US-42 (login) → générer pour US-43 (profil avec login) → vérifier que US-43 importe LoginPage au lieu de le recréer.

**Acceptance Scenarios**:

1. **Given** US-42 a été générée avec `LoginPage.page.ts`, **When** Sarah génère US-43 qui implique un login, **Then** le code utilise `import { LoginPage }` et NE recrée PAS la classe.
2. **Given** aucune génération précédente, **When** Sarah génère US-42, **Then** le comportement est identique à aujourd'hui (pas de régression).
3. **Given** 5 générations avec des POM différents, **When** Sarah génère US-46, **Then** le prompt reçoit les signatures des 5 POM et le LLM choisit ceux qui sont pertinents.
4. **Given** un POM existant dont les méthodes ne suffisent pas, **When** le LLM génère le code, **Then** il peut étendre le POM (ajouter des méthodes) plutôt que de le recréer.

---

### US-MC-2 — Registre de Page Objects par équipe (Priority: P1)

Thomas (Tech Lead) peut consulter la liste des Page Objects générés pour son équipe et leur contenu. Ce registre se construit automatiquement à chaque génération.

**Independent Test**: Générer 3 US → vérifier que le registre contient 3+ POM avec leurs méthodes.

**Acceptance Scenarios**:

1. **Given** 3 générations effectuées, **When** Thomas ouvre le registre POM, **Then** il voit la liste des Page Objects avec : nom de classe, fichier, méthodes publiques, US source.
2. **Given** le registre, **When** Thomas supprime un POM obsolète, **Then** il n'est plus injecté dans les futures générations.
3. **Given** deux générations qui créent `LoginPage` avec des signatures différentes, **Then** la dernière version est celle du registre (la plus récente l'emporte).

---

### US-MC-3 — Gestion des conflits de POM (Priority: P2)

Quand le LLM propose un POM qui entre en conflit avec un existant (même nom, méthodes différentes), le système détecte le conflit et demande à l'utilisateur de choisir : garder l'existant, remplacer, ou merger.

**Acceptance Scenarios**:

1. **Given** `LoginPage` existe avec `login(email, password)`, **When** le LLM génère un `LoginPage` avec `login(username, password)`, **Then** un conflit est détecté et les deux versions sont présentées.
2. **Given** un conflit, **When** Sarah choisit "Merger", **Then** le POM final contient les deux signatures.

---

## Requirements

- **FR-MC-001**: Le système DOIT maintenir un registre de Page Objects par équipe, mis à jour automatiquement à chaque génération.
- **FR-MC-002**: Le registre DOIT contenir : nom de classe, filename, méthodes publiques (signature), US source, date.
- **FR-MC-003**: Le prompt de génération DOIT inclure les POM du registre pertinents (max 5 POM, sélectionnés par pertinence sémantique ou par page/URL).
- **FR-MC-004**: Le LLM DOIT être instruit de réutiliser les imports existants et d'étendre les POM si nécessaire.
- **FR-MC-005**: Le registre DOIT être consultable et éditable par l'utilisateur (suppression de POM obsolètes).
- **FR-MC-006**: La sélection des POM pertinents NE DOIT PAS ralentir la génération de plus de 2 secondes.
- **Plan**: disponible sur Pro uniquement (car multi-génération implique un usage avancé).

---

# Implementation Plan

## Architecture

### Nouveau concept : POM Registry

Table `pom_registry` qui stocke les signatures des Page Objects générés par équipe.

```
pom_registry
├── id (uuid PK)
├── team_id (uuid FK)
├── class_name (text) — ex: "LoginPage"
├── filename (text) — ex: "pages/LoginPage.page.ts"
├── methods (jsonb) — [{ name, params, returnType, jsdoc }]
├── full_content (text) — code complet du POM (pour injection dans le prompt)
├── source_generation_id (uuid FK → generations)
├── source_user_story_id (uuid FK → user_stories)
├── framework (text) — "playwright" | "selenium" | "cypress"
├── language (text) — "typescript" | "javascript" | "python" | ...
├── created_at (timestamptz)
├── updated_at (timestamptz)
```

**Extraction automatique** : après chaque génération réussie, le fichier `page_object` est parsé (regex sur `export class ... { ... }`) pour extraire le nom de classe et les signatures de méthodes. Stocké dans `pom_registry`.

**Injection dans le prompt** : avant de générer, charger les POM du registre pour le même `(team_id, framework, language)`. Filtrer par pertinence (max 5). Injecter un résumé dans le prompt :

```
## Existing Page Objects (reuse these, do NOT recreate)

### LoginPage (pages/LoginPage.page.ts)
- constructor(page: Page)
- async goto(): Promise<void>
- async login(email: string, password: string): Promise<void>
- async getErrorMessage(): Promise<string>

### DashboardPage (pages/DashboardPage.page.ts)
- constructor(page: Page)
- async goto(): Promise<void>
- async getWelcomeText(): Promise<string>
```

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Table pom_registry + extraction auto | ~6h |
| Phase 2 — Injection dans le prompt de génération | ~4h |
| Phase 3 — Frontend registre POM (consultation + suppression) | ~4h |
| Phase 4 — Détection de conflits (P2) | ~4h |
| **Total** | **~18h** |

---

# Tasks

---

## Phase 1: POM Registry + Extraction (~6h)

- [ ] T001 [P] Créer table `pom_registry` dans `apps/backend/src/db/schema.ts` — schéma ci-dessus
- [ ] T002 [P] Migration Drizzle
- [ ] T003 [P] Créer `apps/backend/src/services/generation/PomRegistryService.ts` :
  - `extractAndRegister(generationId, teamId, files[])` — parse le fichier page_object pour extraire classe + méthodes, upsert dans pom_registry
  - `getRelevantPom(teamId, framework, language, userStoryTitle, limit = 5)` — retourne les POM pertinents. Pertinence v1 : tous les POM du framework/language (max 5 les plus récents). V2 possible : embedding-based similarity.
  - `deletePom(pomId, teamId)` — suppression manuelle
- [ ] T004 [P] Créer `PomParser.ts` — utilitaire d'extraction de signatures depuis le code TS :
  - Regex `export class (\w+)` pour le nom
  - Regex `async (\w+)\((.*?)\)` pour les méthodes publiques
  - Extraire les commentaires JSDoc associés
- [ ] T005 Intégrer `extractAndRegister()` dans `GenerationService.processGeneration()` — après la persistance des fichiers, extraire et enregistrer les POM
- [ ] T006 Tests unitaires PomParser + PomRegistryService

**Checkpoint** : chaque génération alimente automatiquement le registre POM.

---

## Phase 2: Injection dans le prompt (~4h)

- [ ] T007 [P] Modifier `GenerationService.processGeneration()` — avant l'appel LLM, charger les POM pertinents via `PomRegistryService.getRelevantPom()`
- [ ] T008 [P] Construire la section `## Existing Page Objects` dans le prompt — noms de classes, fichiers, signatures de méthodes (pas le code complet sauf si < 3 POM)
- [ ] T009 [P] Ajouter dans le system prompt l'instruction : "Réutilise les Page Objects existants via import. Ne recrée JAMAIS une classe déjà listée. Tu peux ajouter des méthodes à un POM existant si nécessaire."
- [ ] T010 Tests unitaires : génération avec POM existant → vérifier que le prompt contient la section. Génération sans POM → pas de section (pas de régression).

**Checkpoint** : le code généré importe les POM existants.

---

## Phase 3: Frontend registre POM (~4h)

- [ ] T011 Créer `apps/frontend/src/pages/PomRegistryPage.tsx` — liste des POM avec : nom de classe, filename, N méthodes, US source, date. Bouton supprimer.
- [ ] T012 Ajouter route `/settings/pom-registry` dans `App.tsx` et lien dans le menu Settings
- [ ] T013 Endpoint `GET /api/pom-registry` et `DELETE /api/pom-registry/:id` dans une nouvelle route ou dans `pom-templates.ts`

**Checkpoint** : Thomas peut consulter et gérer le registre POM.

---

## Phase 4: Détection de conflits (P2, ~4h)

- [ ] T014 Détecter dans `extractAndRegister()` si un POM avec le même `class_name` existe déjà avec des méthodes différentes
- [ ] T015 Retourner un flag `conflict: true` dans la réponse de génération si un conflit est détecté
- [ ] T016 Frontend : dialog de résolution de conflit (garder existant / remplacer / voir les deux)
