# Feature Specification: Feedback Loop

**Feature Branch**: `007-feedback-loop`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Ajouter un système de feedback (thumbs up/down + commentaire optionnel) sur chaque génération. Les feedbacks sont stockés, agrégés, et à terme utilisés pour améliorer les prompts (exemples négatifs dans le prompt, détection des patterns problématiques).

### Problème

Quand un utilisateur télécharge un test, il n'y a aucun retour. On ne sait pas si le code est utile, s'il compile, s'il a été intégré dans le projet. Impossible d'améliorer les prompts sans savoir ce qui fonctionne ou pas.

### Solution

Un widget thumbs up/down + tags de problème + commentaire libre sur chaque génération. Les feedbacks négatifs alimentent un dataset de "mauvais exemples" qui peut être injecté dans les prompts futurs.

---

## User Stories

### US-FL-1 — Donner un feedback sur une génération (Priority: P1)

Sarah génère des tests, les consulte, et donne un feedback : pouce haut (le code est bon) ou pouce bas (problème). Si pouce bas, elle peut sélectionner un tag de problème (import manquant, mauvais sélecteur, logique incorrecte, structure POM non respectée) et ajouter un commentaire.

**Acceptance Scenarios**:

1. **Given** une génération terminée, **When** Sarah clique thumbs up, **Then** le feedback "positive" est enregistré avec la date et l'auteur.
2. **Given** une génération terminée, **When** Sarah clique thumbs down, **Then** un panel s'ouvre avec des tags de problème (multi-select) et un champ commentaire optionnel.
3. **Given** un feedback déjà donné, **When** Sarah revient sur la génération, **Then** son feedback précédent est affiché (modifiable).

---

### US-FL-2 — Dashboard de feedbacks pour l'admin (Priority: P2)

Thomas (Tech Lead) peut voir les feedbacks de son équipe : taux de satisfaction, problèmes les plus fréquents, tendance.

**Acceptance Scenarios**:

1. **Given** 20 feedbacks ce mois (15 positifs, 5 négatifs), **Then** le dashboard affiche 75% satisfaction et le top 3 des tags négatifs.
2. **Given** le dashboard, **When** Thomas clique sur un tag, **Then** il voit les générations concernées pour investiguer.

---

### US-FL-3 — Injection dans les prompts (Priority: P3, futur)

Les feedbacks négatifs avec un pattern récurrent sont injectés comme exemples à éviter dans le prompt de génération. Ce n'est pas implémenté en v1 — on collecte d'abord les données.

---

## Requirements

- **FR-FL-001**: Chaque génération DOIT avoir un widget de feedback (thumbs up/down).
- **FR-FL-002**: Les feedbacks négatifs DOIVENT permettre de sélectionner des tags de problème prédéfinis.
- **FR-FL-003**: Les tags prédéfinis sont : `import_missing`, `wrong_selector`, `incorrect_logic`, `pom_not_respected`, `data_not_externalized`, `missing_edge_case`, `other`.
- **FR-FL-004**: Un commentaire libre (max 500 chars) DOIT être possible.
- **FR-FL-005**: Les feedbacks DOIVENT être agrégés par équipe dans le dashboard analytics (si 006 implémenté).
- **Plan**: disponible sur Starter et Pro.

---

# Implementation Plan

## Data Model

### Nouvelle table : `generation_feedbacks`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `generation_id` | uuid FK → generations | onDelete cascade |
| `team_id` | uuid FK → teams | isolation |
| `user_id` | uuid | auteur du feedback |
| `rating` | text | `'positive'` \| `'negative'` |
| `tags` | jsonb | `['import_missing', 'wrong_selector']` — vide si positive |
| `comment` | text | nullable, max 500 chars |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Contrainte** : unique `(generation_id, user_id)` — un feedback par utilisateur par génération.

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Table + service + route | ~3h |
| Phase 2 — Widget frontend thumbs up/down | ~3h |
| Phase 3 — Agrégats dans analytics (si 006 fait) | ~2h |
| **Total** | **~8h** |

---

# Tasks

## Phase 1: Backend (~3h)

- [ ] T001 [P] Table `generation_feedbacks` dans schema.ts + migration
- [ ] T002 [P] Routes dans un nouveau fichier ou dans `generations.ts` :
  - `POST /api/generations/:id/feedback` — body `{ rating, tags?, comment? }`
  - `GET /api/generations/:id/feedback` — retourne le feedback de l'utilisateur courant
  - `PUT /api/generations/:id/feedback` — modifier un feedback existant
- [ ] T003 Tests unitaires : créer, modifier, contrainte unicité

## Phase 2: Frontend (~3h)

- [ ] T004 [P] Créer `apps/frontend/src/components/FeedbackWidget.tsx` :
  - Deux boutons thumbs up/down sous le CodeViewer
  - Si thumbs down : panel avec checkboxes tags + textarea commentaire
  - État : non noté / positif / négatif
- [ ] T005 Intégrer dans la page de visualisation du code généré (StoryDetailPage onglet Génération)

## Phase 3: Analytics (si 006 fait, ~2h)

- [ ] T006 Ajouter dans `AnalyticsService` : taux de satisfaction, top tags négatifs
- [ ] T007 Section "Satisfaction" dans le dashboard analytics

---

# CLAUDE_TASK — 007-feedback-loop

> Feedback thumbs up/down sur les générations.
> Usage : `claude < CLAUDE_TASK.md`

## Contexte

TestForge — monorepo pnpm. Voir `CLAUDE.md` à la racine.

## Implémentation

### 1. Table + Migration

Ajouter `generation_feedbacks` dans `apps/backend/src/db/schema.ts`. Unique constraint sur `(generation_id, user_id)`. Générer migration.

### 2. Routes

Ajouter dans `apps/backend/src/routes/generations.ts` (fichier existant) :

```typescript
// POST /api/generations/:id/feedback
const feedbackSchema = z.object({
  rating: z.enum(['positive', 'negative']),
  tags: z.array(z.enum(['import_missing', 'wrong_selector', 'incorrect_logic', 'pom_not_respected', 'data_not_externalized', 'missing_edge_case', 'other'])).default([]),
  comment: z.string().max(500).optional(),
});
```

Upsert : si un feedback existe déjà pour cet utilisateur + génération, update au lieu de créer.

### 3. Frontend

Créer `apps/frontend/src/components/FeedbackWidget.tsx`. Deux icônes (ThumbsUp, ThumbsDown de lucide-react). Si négatif : panel avec checkboxes shadcn/ui pour les tags + Textarea pour le commentaire. Bouton "Envoyer".

Intégrer sous le `CodeViewer` dans `StoryDetailPage.tsx`.

### Vérification

```bash
pnpm --filter backend test && pnpm --filter backend typecheck
git commit -m "feat: 007-feedback-loop — thumbs up/down on generations"
```
