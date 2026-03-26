# Feature Specification: Incremental Regeneration

**Feature Branch**: `008-incremental-regen`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Quand une US est modifiée (writeback, sync, ou édition dans Jira/ADO) et que des tests existaient déjà, proposer "Mettre à jour les tests" au lieu de "Régénérer de zéro". Le LLM reçoit le code existant + le diff de l'US et produit une mise à jour ciblée, préservant les ajustements manuels du QA.

### Problème

Aujourd'hui, toute régénération repart de zéro. Si le QA a ajusté des sélecteurs, ajouté un cas de test, ou corrigé une donnée dans les fixtures, tout est perdu. Ça décourage l'itération et pousse les utilisateurs à ne jamais régénérer, même quand l'US change.

### Solution

Détecter les changements dans l'US (diff description + AC), injecter le code existant + le diff dans le prompt, et demander au LLM de produire uniquement les modifications nécessaires.

---

## User Stories

### US-IR-1 — Détection de changement sur l'US (Priority: P1)

Après une sync Jira/ADO, TestForge détecte que l'US a changé depuis la dernière génération et affiche un badge "US modifiée — tests potentiellement obsolètes".

**Acceptance Scenarios**:

1. **Given** une génération existante pour US-42, **When** la sync met à jour le titre ou les AC de US-42, **Then** un badge orange "US modifiée depuis la dernière génération" s'affiche sur la page détail.
2. **Given** l'US n'a pas changé, **Then** aucun badge n'est affiché.
3. **Given** le badge affiché, **When** Sarah clique dessus, **Then** un diff avant/après de l'US est affiché.

---

### US-IR-2 — Régénération incrémentale (Priority: P1)

Sarah voit que l'US a changé. Elle clique "Mettre à jour les tests" au lieu de "Régénérer". Le LLM reçoit le code existant et le diff, et produit une version mise à jour.

**Acceptance Scenarios**:

1. **Given** un diff montrant un nouveau critère d'acceptance ajouté, **When** Sarah clique "Mettre à jour les tests", **Then** le code généré ajoute un nouveau test case sans modifier les tests existants.
2. **Given** un diff montrant un AC supprimé, **When** la mise à jour est lancée, **Then** le test correspondant est retiré et les autres sont préservés.
3. **Given** un diff montrant un changement de libellé mineur, **When** la mise à jour est lancée, **Then** seuls les commentaires et les noms de test sont mis à jour, le code logique reste identique.
4. **Given** la mise à jour terminée, **When** Sarah compare le résultat, **Then** un diff code avant/après est affiché pour qu'elle valide les changements.

---

### US-IR-3 — Fallback vers régénération complète (Priority: P2)

Si le diff est trop important (> 60% des AC changés), le système recommande une régénération complète plutôt qu'une mise à jour incrémentale.

**Acceptance Scenarios**:

1. **Given** un diff touchant 80% des AC, **When** Sarah clique "Mettre à jour", **Then** un message "Les changements sont importants — une régénération complète est recommandée" est affiché avec les deux options.

---

## Requirements

- **FR-IR-001**: Le système DOIT détecter les changements dans l'US depuis la dernière génération (comparaison description + AC via `fetchedAt` vs `generation.createdAt`).
- **FR-IR-002**: Un badge visuel DOIT signaler les US modifiées depuis la dernière génération.
- **FR-IR-003**: Le prompt de mise à jour incrémentale DOIT inclure : le code existant (3 fichiers), le diff de l'US, et l'instruction de minimiser les modifications.
- **FR-IR-004**: Le diff avant/après du code DOIT être affiché pour validation.
- **FR-IR-005**: Si le diff US dépasse un seuil configurable (défaut: 60% des AC modifiés), le système DOIT recommander une régénération complète.
- **FR-IR-006**: L'option "Régénérer de zéro" DOIT toujours rester disponible.
- **Plan**: disponible sur Starter et Pro.

---

# Implementation Plan

## Architecture

### Détection du changement

Comparer `user_stories.fetchedAt` avec `generations.createdAt` pour la même US. Si `fetchedAt > createdAt` → l'US a changé.

Pour le diff textuel : stocker un hash (SHA-256) de `description + acceptanceCriteria` au moment de la génération dans une nouvelle colonne `generations.source_hash`. À la sync suivante, comparer le hash actuel avec le hash stocké.

### Prompt incrémental

Nouveau prompt : `apps/backend/src/services/generation/prompts/incremental-v1.0.ts`

```
Tu es un expert QA senior. Le code de test suivant a été généré pour une User Story.
La User Story a été modifiée. Mets à jour le code pour refléter les changements.

## Code existant
### pages/LoginPage.page.ts
{existing_pom}

### tests/login.spec.ts
{existing_spec}

### fixtures/login.json
{existing_fixtures}

## Diff de la User Story
### Critères d'acceptance AJOUTÉS :
{added_ac}

### Critères d'acceptance SUPPRIMÉS :
{removed_ac}

### Critères d'acceptance MODIFIÉS :
{modified_ac}

## Instructions
- Modifie le MINIMUM de code nécessaire
- Préserve tous les tests existants qui ne sont pas impactés par le diff
- Préserve les ajustements manuels (sélecteurs modifiés, données ajoutées)
- Pour les AC ajoutés : ajoute de nouveaux tests
- Pour les AC supprimés : retire les tests correspondants
- Retourne les 3 fichiers complets au format JSON habituel
```

### Calcul du diff AC

Utilitaire `diffAcceptanceCriteria(oldAC, newAC)` :
- Split par ligne
- Diff ligne à ligne (Levenshtein ou simple set comparison)
- Retourne `{ added: string[], removed: string[], modified: string[], changePercent: number }`

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Détection changement + hash + badge | ~4h |
| Phase 2 — Diff AC + prompt incrémental | ~5h |
| Phase 3 — Frontend diff code + bouton "Mettre à jour" | ~4h |
| **Total** | **~13h** |

---

# Tasks

## Phase 1: Détection de changement (~4h)

- [ ] T001 [P] Ajouter colonne `source_hash` (text, nullable) sur `generations` — hash SHA-256 de `description + AC` au moment de la génération
- [ ] T002 [P] Modifier `GenerationService.createPending()` — calculer et stocker le `source_hash`
- [ ] T003 [P] Créer utilitaire `computeStoryHash(description, acceptanceCriteria)` dans `apps/backend/src/utils/`
- [ ] T004 Ajouter endpoint `GET /api/user-stories/:id/change-status` — compare le hash actuel de l'US avec le `source_hash` de la dernière génération. Retourne `{ changed: boolean, generationId, diff? }`
- [ ] T005 Frontend : badge "US modifiée" sur StoryDetailPage onglet Génération si `changed = true`

## Phase 2: Prompt incrémental + Diff AC (~5h)

- [ ] T006 [P] Créer `apps/backend/src/utils/diffAC.ts` — `diffAcceptanceCriteria(oldAC, newAC)` retourne `{ added, removed, modified, changePercent }`
- [ ] T007 [P] Créer `apps/backend/src/services/generation/prompts/incremental-v1.0.ts` — prompt de mise à jour incrémentale
- [ ] T008 [P] Ajouter méthode `processIncrementalGeneration(generationId, previousGenerationId, teamId, ...)` dans `GenerationService` — charge le code existant + le diff, appelle LLM avec le prompt incrémental
- [ ] T009 Ajouter champ `incremental` (boolean, default false) dans le body de `POST /api/generations` + colonne sur `generations`
- [ ] T010 Si `changePercent > 60%` → retourner un warning dans la réponse recommandant la régénération complète
- [ ] T011 Tests unitaires : diff AC, prompt construction, détection du seuil

## Phase 3: Frontend (~4h)

- [ ] T012 Bouton "Mettre à jour les tests" à côté de "Régénérer" quand le badge changement est visible
- [ ] T013 Après mise à jour : afficher un diff code (avant/après) avec coloration syntaxique — librairie `diff` côté frontend ou comparaison côté backend
- [ ] T014 Dialog de recommandation si changePercent > 60% : "Les changements sont importants — une régénération complète est recommandée"

---

# CLAUDE_TASK — 008-incremental-regen

> Régénération incrémentale quand l'US change.
> `claude < specs/008-incremental-regen/spec.md`

Voir les tâches détaillées ci-dessus. Points clés :
- Colonne `source_hash` sur `generations` pour la détection
- Utilitaire `diffAC.ts` pour le diff des critères d'acceptance
- Nouveau prompt `incremental-v1.0.ts` qui reçoit code existant + diff
- Seuil 60% pour recommander la régénération complète
- Commit : `feat: 008-incremental-regen — update tests when US changes`
