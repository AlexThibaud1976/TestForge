# Checklist d'Implémentation — Filtre UI par Projet/Connexion

> Dernière mise à jour : 2026-03-26
> Estimation totale : ~8-10h (1 semaine de travail soirs/weekends)

---

## Phase 1 : Reconnaissance & Validation API (1h)

**But :** Vérifier que l'existant supporte bien la feature sans modification backend.

- [x] T001 ~~Identifier le composant exact de la carte story~~ → **TROUVÉ :** `UserStoryCard` est une fonction locale dans `apps/frontend/src/pages/StoriesPage.tsx` (avec `StatusBadge` aussi local). Un filtre `connectionFilter` state + `<select>` basique existe déjà.
- [ ] T002 Vérifier que `GET /api/connections` retourne bien `id`, `name`, `type`, `isActive` pour l'équipe courante
- [ ] T003 Vérifier que `GET /api/user-stories?connectionId=<uuid>` filtre correctement (test manuel Postman/curl)
- [ ] T004 Vérifier que `GET /api/user-stories?connectionId=<invalid-uuid>` retourne `{ data: [], total: 0 }` sans erreur 400/500
- [ ] T005 Vérifier que les filtres combinés fonctionnent : `?connectionId=xxx&search=login&status=To Do`

**Checkpoint :** API backend validée, aucune modification nécessaire. Si un problème est trouvé → créer un correctif backend avant de continuer.

---

## Phase 2 : Tests Backend — Non-régression (1h)

**But :** Figer le comportement API actuel avec des tests d'intégration.

> ⚠️ **Test-first :** Ces tests documentent le contrat API existant. Ils DOIVENT passer sur le code actuel.

- [ ] T006 [P] Écrire test intégration : `GET /api/user-stories?connectionId=<valid-uuid>` → retourne uniquement les stories de cette connexion
- [ ] T007 [P] Écrire test intégration : `GET /api/user-stories?connectionId=<invalid-uuid>` → retourne 0 résultats, status 200
- [ ] T008 [P] Écrire test intégration : `GET /api/user-stories?connectionId=<uuid>&search=login` → filtre combiné
- [ ] T009 [P] Écrire test intégration : `GET /api/user-stories?connectionId=<uuid>&status=To Do` → filtre combiné

**Checkpoint :** 4 tests passent au vert. Le contrat API est figé.

---

## Phase 3 : Hook `useConnectionFilter` — Test-First (2h)

**But :** Logique métier du filtre : lecture URL, écriture URL, chargement connexions, gestion des cas limites.

### 3a — Tests du hook (RED)

- [ ] T010 Écrire test : `should return all active connections from API`
- [ ] T011 Écrire test : `should default to null connectionId when no URL param`
- [ ] T012 Écrire test : `should read connectionId from URL search params on mount`
- [ ] T013 Écrire test : `should update URL when setConnectionId is called`
- [ ] T014 Écrire test : `should clear URL param when connectionId set to null`
- [ ] T015 Écrire test : `should preserve other URL params (search, status) when changing connectionId`
- [ ] T016 Écrire test : `should fallback to null if URL connectionId not found in connections list`
- [ ] T017 Vérifier que tous les tests échouent (RED) avant de passer à l'implémentation

### 3b — Implémentation du hook (GREEN)

- [ ] T018 Créer `apps/frontend/src/hooks/useConnectionFilter.ts`
- [ ] T019 Implémenter le fetch des connexions actives (réutiliser le client API existant)
- [ ] T020 Implémenter la sync bidirectionnelle état ↔ URL (useSearchParams ou équivalent)
- [ ] T021 Implémenter le fallback pour connectionId invalide
- [ ] T022 Vérifier que tous les tests passent (GREEN)
- [ ] T023 Refactor si nécessaire (nommage, types, extraction de helpers)

**Checkpoint :** Hook fonctionnel, 7 tests au vert.

---

## Phase 4 : Composants UI — Test-First (2.5h)

**But :** Les deux composants visuels : dropdown et badge.

### 4a — `ConnectionFilter` (dropdown)

#### Tests (RED)

- [ ] T024 Écrire test : `should render dropdown with connection options`
- [ ] T025 Écrire test : `should show "Tous les projets" as default label`
- [ ] T026 Écrire test : `should display Jira icon for type jira`
- [ ] T027 Écrire test : `should display ADO icon for type azure_devops`
- [ ] T028 Écrire test : `should call onChange with connectionId when option selected`
- [ ] T029 Écrire test : `should not render when connections list is empty`
- [ ] T030 Vérifier RED

#### Implémentation (GREEN)

- [ ] T031 Créer `apps/frontend/src/components/ConnectionFilter.tsx`
- [ ] T032 Implémenter le dropdown (cohérent avec le style shadcn/ui existant)
- [ ] T033 Ajouter les icônes Jira (bleue) et ADO (violette)
- [ ] T034 Vérifier GREEN + refactor

### 4b — `ConnectionBadge` (badge par story)

#### Tests (RED)

- [ ] T035 Écrire test : `should render connection name`
- [ ] T036 Écrire test : `should truncate name longer than 20 chars`
- [ ] T037 Écrire test : `should show correct icon for connection type`
- [ ] T038 Écrire test : `should call onClick with connectionId`
- [ ] T039 Écrire test : `should render "Projet supprimé" for missing connection`
- [ ] T040 Vérifier RED

#### Implémentation (GREEN)

- [ ] T041 Créer `apps/frontend/src/components/ConnectionBadge.tsx`
- [ ] T042 Implémenter le badge compact avec icône type + nom tronqué
- [ ] T043 Implémenter le onClick (applique le filtre)
- [ ] T044 Implémenter le fallback "Projet supprimé" grisé
- [ ] T045 Vérifier GREEN + refactor

**Checkpoint :** 2 composants, 12 tests au vert.

---

## Phase 5 : Intégration dans la page User Stories (1.5h)

**But :** Assembler les composants dans la page existante.

- [ ] T046 Intégrer `useConnectionFilter` dans `UserStoriesPage.tsx`
- [ ] T047 Ajouter `<ConnectionFilter>` dans la barre de filtres (après "Tous statuts")
- [ ] T048 Ajouter `<ConnectionBadge>` dans chaque carte de story
- [ ] T049 Connecter le state du hook aux props des composants
- [ ] T050 Vérifier que le bouton "Analyser tout le sprint" respecte le filtre actif
- [ ] T051 Ajouter un indicateur du nombre de stories avant lancement de l'analyse batch
- [ ] T052 Test manuel complet : filtre, badge clic, URL persistence, combinaison filtres, back/forward browser

**Checkpoint :** Feature fonctionnelle end-to-end en local.

---

## Phase 6 : Documentation & Polish (1h)

**But :** Mise à jour docs et finitions.

- [ ] T053 Mettre à jour le User Guide : section "User Stories" avec description du filtre projet
- [ ] T054 Ajouter une capture d'écran du nouveau filtre dans la doc
- [ ] T055 Vérifier que `pnpm typecheck` passe sans erreur
- [ ] T056 Vérifier que `pnpm lint` passe sans erreur
- [ ] T057 Vérifier que `pnpm test` passe (tous les tests existants + nouveaux)
- [ ] T058 Revue finale : pas de `any`, pas de TODO oublié, pas de console.log
- [ ] T059 Commit + push sur branche feature → CI GitHub Actions passe

**Checkpoint :** Feature prête pour merge. CI verte. Docs à jour.

---

## Récapitulatif

| Phase | Tâches | Temps estimé | Dépendance |
|---|---|---|---|
| 1. Reconnaissance | T001–T005 | 1h | — |
| 2. Tests backend | T006–T009 | 1h | Phase 1 |
| 3. Hook useConnectionFilter | T010–T023 | 2h | Phase 2 |
| 4. Composants UI | T024–T045 | 2.5h | Phase 3 |
| 5. Intégration page | T046–T052 | 1.5h | Phase 4 |
| 6. Docs & polish | T053–T059 | 1h | Phase 5 |
| **Total** | **59 tâches** | **~9h** | |

---

> 📊 Progression : 1 / 59 tâches complétées
> 📎 Voir spec.md pour les critères d'acceptation et plan.md pour l'architecture technique.
