# Plan Technique — TestForge : Filtre UI par Projet/Connexion

> Architecture et stratégie d'implémentation — 2026-03-26

---

## Summary

Feature P1 purement frontend. L'API backend supporte déjà le filtrage par `connectionId` sur `GET /api/user-stories` et la liste des connexions via `GET /api/connections`. Aucune migration DB, aucune nouvelle route API. Le travail se concentre sur 3 composants React + adaptation de la page User Stories existante.

---

## Constitution Check

| Principe | Statut | Notes |
|---|---|---|
| TypeScript strict — aucun `any` implicite | ✅ Pass | Composants React typés, props interfaces |
| Test-first obligatoire | ✅ Pass | Tests Vitest pour les hooks, tests composants pour le dropdown |
| Docs MAJ à chaque changement | ✅ Pass | README inchangé (feature UI), User Guide mis à jour |
| Routes API vérifiées/validées | ✅ Pass | Aucune nouvelle route — vérification que `connectionId` param fonctionne |
| Non-régression sur existant | ✅ Pass | Les filtres existants (search, status) continuent à fonctionner |

---

## 1. Architecture

### Impact architectural

**Zéro impact backend.** La feature est 100% frontend avec utilisation des endpoints existants :

| Endpoint existant | Usage dans cette feature |
|---|---|
| `GET /api/connections` | Charger la liste des connexions pour le dropdown |
| `GET /api/user-stories?connectionId=<uuid>` | Filtrer les stories (param déjà supporté) |

### Nouveaux composants frontend

| Composant | Fichier | Responsabilité |
|---|---|---|
| `ConnectionFilter` | `components/ConnectionFilter.tsx` | Dropdown sélecteur de connexion |
| `ConnectionBadge` | `components/ConnectionBadge.tsx` | Badge source sur chaque carte story |
| `useConnectionFilter` | `hooks/useConnectionFilter.ts` | Hook : sync état filtre ↔ URL ↔ API |

### Composants modifiés

| Composant existant | Modification |
|---|---|
| `pages/UserStoriesPage.tsx` | Intégration du dropdown + badge + hook |
| `components/StoryCard.tsx` (ou équivalent) | Ajout du `ConnectionBadge` |

---

## 2. Schéma de Base de Données

**Aucune modification.** Les tables `source_connections` et `user_stories` ont déjà tout ce qu'il faut :

- `source_connections.id` → identifiant du filtre
- `source_connections.name` → label dans le dropdown
- `source_connections.type` → icône Jira/ADO
- `source_connections.is_active` → filtrage des connexions affichées
- `user_stories.connection_id` → FK pour le filtre côté API

---

## 3. API Design

**Aucune nouvelle route.** Vérifications de non-régression sur les routes existantes :

### Vérification : GET /api/connections

| Aspect | Attendu | Action |
|---|---|---|
| Retourne toutes les connexions de l'équipe | ✅ Vérifié dans le code source | Aucune |
| Filtre par `teamId` (middleware auth) | ✅ Vérifié | Aucune |
| Inclut `name`, `type`, `isActive` | ✅ Vérifié | Aucune |

### Vérification : GET /api/user-stories?connectionId=xxx

| Aspect | Attendu | Action |
|---|---|---|
| Param `connectionId` optionnel | ✅ Vérifié dans `userStories.ts` route | Aucune |
| Se combine avec `search`, `status` | ✅ Vérifié (conditions `and()`) | Aucune |
| Retourne `total` (count) mis à jour | ✅ Vérifié | Aucune |
| UUID invalide → pas de crash (0 résultats) | ⚠️ À vérifier | Ajouter un test d'intégration |

---

## 4. Stratégie de Test

### Approche test-first (obligatoire par constitution)

Chaque composant/hook est testé AVANT implémentation. Les tests sont écrits, vérifiés qu'ils échouent (red), puis l'implémentation les fait passer (green).

### Tests Unitaires (Vitest + React Testing Library)

#### Hook `useConnectionFilter`

| Test | Description |
|---|---|
| `should return all connections from API` | Mock fetch, vérifie la liste retournée |
| `should default to null connectionId (no filter)` | État initial sans param URL |
| `should read connectionId from URL search params` | Simule URL avec `?connectionId=xxx` |
| `should update URL when connectionId changes` | Appel setConnectionId → vérifie pushState |
| `should clear connectionId when set to null` | Retour à "Tous les projets" → param supprimé |
| `should preserve other URL params (search, status)` | Change connectionId, vérifie que `search` reste |
| `should fallback to null if connectionId not in connections list` | URL avec UUID inconnu → null |

#### Composant `ConnectionFilter`

| Test | Description |
|---|---|
| `should render dropdown with connections` | Props: liste de connexions → vérifie les options |
| `should show "Tous les projets" as default` | Pas de selectedId → label par défaut |
| `should display Jira icon for jira type` | Connexion type=jira → icône bleue |
| `should display ADO icon for azure_devops type` | Connexion type=azure_devops → icône violette |
| `should call onChange with connectionId on select` | Clic sur option → callback appelé |
| `should hide when 0 connections` | Props: liste vide → composant non rendu |

#### Composant `ConnectionBadge`

| Test | Description |
|---|---|
| `should render connection name` | Props: name="Backend API" → texte affiché |
| `should truncate name at 20 chars` | Props: name très long → "Backend API Platfo…" |
| `should show Jira icon for jira type` | Props: type=jira → icône Jira |
| `should call onClick when clicked` | Clic → callback appelé avec connectionId |
| `should show "Projet supprimé" for null connection` | Pas de connexion trouvée → badge grisé |

### Tests d'intégration (Vitest)

| Test | Description |
|---|---|
| `GET /api/user-stories?connectionId=<valid-uuid>` | Retourne uniquement les stories de cette connexion |
| `GET /api/user-stories?connectionId=<invalid-uuid>` | Retourne 0 stories, pas d'erreur 400/500 |
| `GET /api/user-stories?connectionId=<uuid>&search=login` | Filtre combiné fonctionne |
| `GET /api/user-stories?connectionId=<uuid>&status=To Do` | Filtre combiné fonctionne |

### Couverture cible

| Type | Cible |
|---|---|
| Unit (hook + composants) | 100% des cas listés ci-dessus |
| Integration (API) | 4 tests de validation endpoints existants |
| E2E | Hors scope P1 (pas de Playwright sur le frontend TestForge lui-même) |

---

## 5. Intégrations Tierces

**Aucune nouvelle intégration.** Cette feature n'appelle pas d'API externe (Jira, ADO, LLM). Elle consomme uniquement les données déjà syncées en base.

---

## 6. Déploiement & CI/CD

### Pipeline existant (aucune modification)

1. Push sur `main` → GitHub Actions
2. Lint + TypeScript check + Tests Vitest
3. Build frontend (Vite) → Deploy Vercel
4. Build backend → Deploy Railway

### Aucune variable d'environnement supplémentaire

---

## 7. Fichiers impactés — Cartographie

### Nouveaux fichiers (frontend)

```
apps/frontend/src/
├── components/
│   ├── ConnectionFilter.tsx          # Dropdown sélecteur
│   ├── ConnectionFilter.test.tsx     # Tests du dropdown
│   ├── ConnectionBadge.tsx           # Badge source par story
│   └── ConnectionBadge.test.tsx      # Tests du badge
├── hooks/
│   ├── useConnectionFilter.ts        # Hook sync URL ↔ état ↔ API
│   └── useConnectionFilter.test.ts   # Tests du hook
```

### Fichiers modifiés (frontend)

```
apps/frontend/src/
├── pages/
│   └── UserStoriesPage.tsx           # Intégration dropdown + badge + hook
```

### Fichiers modifiés (backend — tests uniquement)

```
apps/backend/src/
├── routes/
│   └── __tests__/
│       └── userStories.integration.test.ts  # 4 nouveaux tests de non-régression
```

### Documentation

```
docs/
└── user-guide.md                     # MAJ section "User Stories" avec filtre projet
```

---

## 8. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Le composant StoryCard n'existe pas tel quel (nom différent) | Faible | Identifier le composant exact avant de coder |
| La route `GET /api/connections` ne retourne pas `isActive` | Faible | Vérifier le returning() de la route ; si absent, ajouter le champ |
| Le hook URL sync casse la navigation browser (back/forward) | Moyen | Utiliser `replaceState` plutôt que `pushState` pour les filtres |
| Beaucoup de connexions (10+) rend le dropdown inutilisable | Faible | Tronquer à 20 connexions dans le dropdown ; ajouter recherche dans P2 |

---

> 📎 **Dépendance spec.md :** Voir spec.md pour les user stories et critères d'acceptation.
> 📎 **Dépendance tasks.md :** Voir tasks.md pour la checklist d'implémentation.
