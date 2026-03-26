# Feature Specification: Smart Import Filters

**Feature Branch**: `009-smart-import`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Enrichir la sync Jira/ADO avec des filtres intelligents : sprint actif, statuts, labels, et texte libre. L'utilisateur ne voit que les US pertinentes au lieu du projet entier.

### Problème

La sync actuelle ramène TOUTES les US du projet Jira/ADO (maxResults=100). Sur un projet avec 500+ US, c'est du bruit. Le QA veut voir uniquement les US du sprint courant, ou celles avec le label "ready-for-qa".

### Solution

Ajouter des filtres à l'endpoint `POST /api/user-stories/sync` et enrichir le JQL/WIQL envoyé aux APIs Jira/ADO. Côté frontend, un panel de filtres sur la page Stories.

---

## User Stories

### US-SI-1 — Filtre par sprint à la sync (Priority: P1)

Thomas veut synchroniser uniquement les US du sprint courant. Il sélectionne le sprint dans un dropdown et lance la sync.

**Acceptance Scenarios**:

1. **Given** la page Connexions, **When** Thomas clique "Synchroniser", **Then** un dialog demande de choisir : "Tout le projet" ou un sprint spécifique.
2. **Given** le sprint "Sprint 14" sélectionné, **When** la sync s'exécute, **Then** seules les US assignées au Sprint 14 sont importées/mises à jour.
3. **Given** une connexion ADO, **When** Thomas sélectionne l'itération courante, **Then** le WIQL filtre par `[System.IterationPath]`.

---

### US-SI-2 — Filtre par statut et labels (Priority: P1)

Sarah veut ne voir que les US "Ready" ou "In Progress", et filtrer par label "ready-for-qa".

**Acceptance Scenarios**:

1. **Given** les filtres "statuts: Ready, In Progress" et "label: ready-for-qa", **When** la sync s'exécute, **Then** seules les US correspondantes sont importées.
2. **Given** aucun filtre, **Then** le comportement actuel est préservé (toutes les US).

---

### US-SI-3 — Filtres côté frontend sur la liste des US (Priority: P2)

La page Stories a des filtres locaux (sur les US déjà importées) : sprint, statut, label, texte libre.

**Acceptance Scenarios**:

1. **Given** 50 US importées, **When** Sarah filtre par "Sprint 14", **Then** seules les US du Sprint 14 sont affichées.
2. **Given** le filtre texte "login", **Then** les US dont le titre ou la description contient "login" sont affichées.

---

## Requirements

- **FR-SI-001**: L'endpoint de sync DOIT accepter des filtres optionnels `{ sprint?, statuses?, labels[] }`.
- **FR-SI-002**: Le JiraConnector DOIT enrichir le JQL avec les filtres (ex: `AND sprint = "Sprint 14" AND status IN ("Ready", "In Progress")`).
- **FR-SI-003**: L'ADOConnector DOIT enrichir le WIQL avec les filtres (iteration path, state, tags).
- **FR-SI-004**: Le frontend DOIT proposer un dropdown de sprints disponibles (fetch depuis Jira/ADO).
- **FR-SI-005**: Les filtres côté frontend (post-import) DOIVENT être indépendants des filtres de sync.
- **Plan**: disponible sur Starter et Pro.

---

# Implementation Plan

## Architecture

### Modification du JiraConnector

`fetchUserStories()` accepte un objet `filters` optionnel :

```typescript
interface SyncFilters {
  sprint?: string;        // nom du sprint Jira
  statuses?: string[];    // ["Ready", "In Progress"]
  labels?: string[];      // ["ready-for-qa"]
}
```

Le JQL actuel `project = ${key} AND issuetype = Story` est enrichi :
```
project = PROJ AND issuetype = Story 
AND sprint = "Sprint 14" 
AND status IN ("Ready", "In Progress")
AND labels IN ("ready-for-qa")
```

### Nouveau endpoint : liste des sprints

`GET /api/connections/:id/sprints` — retourne les sprints du projet connecté.
- Jira : `GET /rest/agile/1.0/board/{boardId}/sprint`
- ADO : itérations via `GET /{project}/_apis/work/teamsettings/iterations`

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Filtres backend (JQL/WIQL enrichi) | ~4h |
| Phase 2 — Endpoint sprints + frontend filtres sync | ~4h |
| Phase 3 — Filtres locaux frontend (post-import) | ~3h |
| **Total** | **~11h** |

---

# Tasks

## Phase 1: Filtres backend (~4h)

- [ ] T001 [P] Modifier `JiraConnector.fetchUserStories()` — accepter `filters?: SyncFilters`, enrichir le JQL
- [ ] T002 [P] Modifier `ADOConnector.fetchUserStories()` — accepter `filters?: SyncFilters`, enrichir le WIQL
- [ ] T003 [P] Modifier `POST /api/user-stories/sync` — accepter `{ connectionId, filters? }` dans le body, passer à fetchUserStories
- [ ] T004 Tests unitaires : JQL correct avec filtres, WIQL correct avec filtres, sans filtres = comportement V1

## Phase 2: Sprints + Frontend sync (~4h)

- [ ] T005 [P] Ajouter méthode `listSprints()` dans JiraConnector — `GET /rest/agile/1.0/board/{boardId}/sprint`
- [ ] T006 [P] Ajouter méthode `listIterations()` dans ADOConnector
- [ ] T007 Route `GET /api/connections/:id/sprints` — retourne la liste des sprints/itérations
- [ ] T008 Modifier le dialog de sync dans le frontend : dropdown sprint + checkboxes statuts + input labels

## Phase 3: Filtres locaux frontend (~3h)

- [ ] T009 Ajouter barre de filtres sur `StoriesPage` : dropdown sprint, multi-select statuts, input labels, recherche texte
- [ ] T010 Filtrage côté client sur les US déjà chargées (pas de nouvel appel API)

---

# CLAUDE_TASK

Voir tâches ci-dessus. Points clés :
- Enrichir JQL/WIQL dans les connectors existants — pas de nouveau service
- Nouveau endpoint `/api/connections/:id/sprints` pour alimenter le dropdown
- Frontend : dialog sync avec filtres + barre de filtres sur StoriesPage
- Commit : `feat: 009-smart-import — sprint and status filters for sync`
