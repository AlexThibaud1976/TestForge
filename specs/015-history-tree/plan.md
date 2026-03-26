# Plan Technique — TestForge : Historique Arborescent

> Architecture et stratégie d'implémentation — 2026-03-26

---

## Summary

Feature mixte frontend + backend. Le backend a besoin d'un nouvel endpoint `GET /api/generations/history` avec JOIN enrichi (generations → analyses → userStories → sourceConnections). Le frontend est une réécriture complète de `HistoryPage.tsx` avec composants arborescents collapsibles. Inclut aussi 2 corrections de bugs.

**Dépendance critique :** le hook `useConnectionFilter` de la feature 002-p1-project-filter doit être mergé avant de commencer.

---

## Constitution Check

| Principe | Statut | Notes |
|---|---|---|
| TypeScript strict — aucun `any` implicite | ✅ Pass | Interfaces typées pour l'API enrichie |
| Test-first obligatoire | ✅ Pass | Tests unitaires endpoint + tests composants tree |
| Docs MAJ à chaque changement | ✅ Pass | User Guide mis à jour |
| Routes API vérifiées/validées | ✅ Pass | Nouveau endpoint + conservation de l'ancien |
| Non-régression sur existant | ✅ Pass | `GET /api/generations` inchangé ; nouveau endpoint en parallèle |

---

## 1. Architecture

### Impact backend

**1 nouveau endpoint** — pas de modification des endpoints existants :

| Endpoint | Méthode | Description |
|---|---|---|
| `GET /api/generations/history` | GET | Générations enrichies avec join US + connexion |

**Paramètres du nouvel endpoint :**

| Param | Type | Requis | Description |
|---|---|---|---|
| `connectionId` | UUID (query) | Non | Filtre par connexion source |

**Pourquoi un nouvel endpoint plutôt que modifier l'existant :** L'endpoint `GET /api/generations` est utilisé par `StoryDetailPage` (avec `?analysisId=xxx`) et par `HistoryPage`. Le modifier casserait le contrat de `StoryDetailPage` qui n'a pas besoin du join lourd. Deux endpoints, deux responsabilités.

### Nouveaux composants frontend

| Composant | Fichier | Responsabilité |
|---|---|---|
| `HistoryTree` | `components/history/HistoryTree.tsx` | Arbre complet : reçoit les données groupées, rend les niveaux |
| `ConnectionGroup` | `components/history/ConnectionGroup.tsx` | Niveau 1 : header connexion collapsible |
| `StoryGroup` | `components/history/StoryGroup.tsx` | Niveau 2 : header US collapsible |
| `GenerationCard` | `components/history/GenerationCard.tsx` | Niveau 3 : carte de génération (leaf) |
| `useHistoryData` | `hooks/useHistoryData.ts` | Hook : fetch + structuration des données en arbre |

### Composant réécrit

| Composant existant | Modification |
|---|---|
| `pages/HistoryPage.tsx` | Réécriture complète : intégration HistoryTree + useConnectionFilter + useHistoryData |

---

## 2. Schéma de Base de Données

**Aucune modification.** Les relations nécessaires existent déjà :

```
generations.analysisId → analyses.id
analyses.userStoryId → userStories.id
userStories.connectionId → sourceConnections.id
```

Le nouvel endpoint fait un LEFT JOIN sur cette chaîne.

---

## 3. API Design

### NOUVEAU : GET /api/generations/history

**Route :** `GET /api/generations/history?connectionId=<uuid>`

**Auth :** JWT requis (teamId extrait du token)

**Query SQL (Drizzle ORM) :**

```typescript
// Pseudo-code Drizzle — LEFT JOIN sur la chaîne complète
const rows = await db
  .select({
    // Génération
    id: generations.id,
    analysisId: generations.analysisId,
    framework: generations.framework,
    language: generations.language,
    usedImprovedVersion: generations.usedImprovedVersion,
    llmProvider: generations.llmProvider,
    llmModel: generations.llmModel,
    status: generations.status,
    durationMs: generations.durationMs,
    createdAt: generations.createdAt,
    // US (nullable)
    userStoryId: userStories.id,
    userStoryTitle: userStories.title,
    userStoryExternalId: userStories.externalId,
    // Connexion (nullable)
    connectionId: sourceConnections.id,
    connectionName: sourceConnections.name,
    connectionType: sourceConnections.type,
  })
  .from(generations)
  .leftJoin(analyses, eq(generations.analysisId, analyses.id))
  .leftJoin(userStories, eq(analyses.userStoryId, userStories.id))
  .leftJoin(sourceConnections, eq(userStories.connectionId, sourceConnections.id))
  .where(conditions) // teamId + connectionId optionnel
  .orderBy(desc(generations.createdAt))
  .limit(50);
```

**Response 200 :**

```json
[
  {
    "id": "uuid",
    "analysisId": "uuid",
    "framework": "playwright",
    "language": "typescript",
    "usedImprovedVersion": false,
    "llmProvider": "anthropic",
    "llmModel": "claude-sonnet-4-6",
    "status": "success",
    "durationMs": 4700,
    "createdAt": "2026-03-25T23:03:18Z",
    "userStoryId": "uuid",
    "userStoryTitle": "Connexion utilisateur avec email et mot de passe",
    "userStoryExternalId": "TF-DEMO-1",
    "connectionId": "uuid",
    "connectionName": "Backend API",
    "connectionType": "jira"
  }
]
```

**Champs nullable :** `userStoryId`, `userStoryTitle`, `userStoryExternalId`, `connectionId`, `connectionName`, `connectionType` — tous `null` si la chaîne de join est rompue (analyse sans US, US sans connexion).

### Vérification non-régression

| Endpoint existant | Impact | Action |
|---|---|---|
| `GET /api/generations` | Aucun | Endpoint inchangé, pas touché |
| `GET /api/generations/:id` | Aucun | Endpoint inchangé |
| `GET /api/generations/:id/download` | Aucun | Endpoint inchangé |

**Important :** Le nouveau endpoint doit être déclaré AVANT le `/:id` dans le routeur Express, sinon `history` sera interprété comme un UUID.

---

## 4. Stratégie de Test

### Tests Backend (Vitest)

#### Endpoint `GET /api/generations/history`

| Test | Description |
|---|---|
| `should return enriched generations with US and connection data` | Vérifie le join complet |
| `should return null fields for orphan generations (no US)` | Génération sans analyse.userStoryId |
| `should filter by connectionId when provided` | Param ?connectionId=xxx |
| `should only return generations for the authenticated team` | Isolation multi-tenant |
| `should return max 50 results ordered by createdAt desc` | Limit + ordering |
| `should return empty array when no generations exist` | Edge case |

#### Route ordering (non-régression)

| Test | Description |
|---|---|
| `GET /api/generations/history should not conflict with GET /api/generations/:id` | Vérifier que les deux routes coexistent |

### Tests Frontend (Vitest + React Testing Library)

#### Hook `useHistoryData`

| Test | Description |
|---|---|
| `should fetch and group data into ConnectionGroup structure` | Vérifie la structuration en arbre |
| `should handle empty response` | 0 générations → 0 groupes |
| `should place orphan generations in "Non liées" group` | connectionId null → groupe spécial |
| `should filter by connectionId` | Passe le param au fetch |

#### Composant `ConnectionGroup`

| Test | Description |
|---|---|
| `should render connection name with type icon` | Props → texte + icône |
| `should toggle collapse on click` | État open/closed |
| `should show generation count` | "12 générations" |

#### Composant `StoryGroup`

| Test | Description |
|---|---|
| `should render externalId and title` | Props → texte |
| `should toggle collapse on click` | État open/closed |

#### Composant `GenerationCard`

| Test | Description |
|---|---|
| `should display framework and language dynamically` | framework=selenium, language=java → "Selenium · Java" |
| `should not show hardcoded "Playwright · TypeScript"` | Test de non-régression du bug |
| `should navigate to /stories/{userStoryId} on "Voir US" click` | Lien correct |
| `should disable "Voir US" when userStoryId is null` | Bouton grisé |
| `should call download handler on ZIP click` | Callback appelé |

### Couverture cible

| Type | Cible |
|---|---|
| Unit backend (endpoint) | 7 tests |
| Unit frontend (hook + composants) | 12 tests |
| Non-régression | Endpoint existant GET /api/generations inchangé |

---

## 5. Fichiers impactés — Cartographie

### Nouveaux fichiers (backend)

```
apps/backend/src/routes/
└── __tests__/
    └── generations.history.test.ts      # 7 tests endpoint
```

### Fichier modifié (backend)

```
apps/backend/src/routes/generations.ts   # Ajout route GET /history (avant /:id !)
```

### Nouveaux fichiers (frontend)

```
apps/frontend/src/
├── components/history/
│   ├── HistoryTree.tsx                  # Arbre complet
│   ├── HistoryTree.test.tsx
│   ├── ConnectionGroup.tsx              # Niveau 1 collapsible
│   ├── ConnectionGroup.test.tsx
│   ├── StoryGroup.tsx                   # Niveau 2 collapsible
│   ├── StoryGroup.test.tsx
│   ├── GenerationCard.tsx               # Niveau 3 (feuille)
│   └── GenerationCard.test.tsx
├── hooks/
│   ├── useHistoryData.ts               # Fetch + structuration arbre
│   └── useHistoryData.test.ts
```

### Fichier réécrit (frontend)

```
apps/frontend/src/pages/HistoryPage.tsx  # Réécriture complète
```

### Documentation

```
docs/user-guide.md                       # MAJ section "Historique"
```

---

## 6. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Le hook `useConnectionFilter` (P1) n'est pas encore mergé | Bloquant | Attendre P1 ou créer un hook temporaire dédié |
| Route `/history` captée par `/:id` Express | Critique | Déclarer `router.get('/history', ...)` AVANT `router.get('/:id', ...)` |
| JOIN lourd sur 4 tables (perf) | Faible | Index existants + limit 50 + teamId filter en premier |
| Générations créées avant le fix du bug "Voir US" n'ont pas de lien | Faible | Le join retrouve le `userStoryId` via analyse → US ; historique complet |
| Le composant `ConnectionBadge` de P1 pourrait être réutilisé | Opportunité | L'utiliser dans `ConnectionGroup` header si disponible |

---

> 📎 **Dépendance spec.md :** Voir spec.md pour les user stories et critères d'acceptation.
> 📎 **Dépendance P1 :** Feature 002-p1-project-filter (hook `useConnectionFilter`).
