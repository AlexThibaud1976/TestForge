# Feature Specification: Duplicate & Overlap Detection

**Feature Branch**: `010-duplicate-detection`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Détecter les US similaires ou redondantes dans le backlog en comparant leurs embeddings LLM. Alerter le PO pour éviter de générer des tests redondants et améliorer la qualité du backlog.

### Problème

"US-42 : Login utilisateur" et "US-58 : Connexion au compte" sont probablement la même US écrite par deux personnes. Sans détection, les deux seront analysées et des tests redondants seront générés, gaspillant des tokens LLM et le temps du QA.

### Solution

Calculer un embedding (vecteur) pour chaque US au moment de la sync. Comparer les embeddings pour détecter les paires similaires (cosine similarity > 0.85). Afficher les doublons potentiels avec un lien de comparaison.

---

## User Stories

### US-DD-1 — Détection automatique de doublons (Priority: P1)

Après une sync, TestForge identifie les paires d'US similaires et affiche un badge "Doublons potentiels (3)" sur la page Stories.

**Acceptance Scenarios**:

1. **Given** 20 US synchronisées dont 2 quasi-identiques, **When** la sync se termine, **Then** un badge "1 doublon potentiel" s'affiche avec un lien vers la comparaison.
2. **Given** le badge cliqué, **Then** un panel montre les paires similaires avec : titres côte à côte, score de similarité (%), et boutons "Ignorer" / "Voir".
3. **Given** aucun doublon détecté, **Then** aucun badge n'est affiché.

---

### US-DD-2 — Comparaison côte à côte (Priority: P2)

Le PO peut voir deux US similaires côte à côte pour décider si c'est un vrai doublon.

**Acceptance Scenarios**:

1. **Given** deux US identifiées comme similaires, **When** Marc clique "Comparer", **Then** un panel affiche les deux US côte à côte (titre, description, AC) avec les passages similaires surlignés.
2. **Given** la comparaison, **When** Marc clique "Ignorer", **Then** cette paire est marquée comme "ignorée" et ne réapparaîtra plus.

---

## Requirements

- **FR-DD-001**: Le système DOIT calculer un embedding pour chaque US importée (titre + description + AC).
- **FR-DD-002**: La comparaison DOIT utiliser la cosine similarity avec un seuil configurable (défaut: 0.85).
- **FR-DD-003**: Les paires similaires DOIVENT être affichées avec le score de similarité.
- **FR-DD-004**: L'utilisateur DOIT pouvoir ignorer un faux positif (marquage persisté).
- **FR-DD-005**: Le calcul des embeddings DOIT être asynchrone (ne pas ralentir la sync).
- **Plan**: disponible sur Pro uniquement (coût tokens embeddings).

---

# Implementation Plan

## Architecture

### Embedding provider

Utiliser le `LLMClient` existant pour générer les embeddings. Options :
- **OpenAI** : `text-embedding-3-small` (1536 dims, très rapide, ~$0.02/1M tokens)
- **Alternative** : calcul local avec un modèle léger si Ollama configuré

Nouvelle méthode sur `LLMClient` interface : `embed(text: string): Promise<number[]>` — implémentée uniquement sur les adapters qui supportent les embeddings (OpenAI, Azure OpenAI). Pour les autres, fallback sur une comparaison textuelle simple (Jaccard similarity sur les mots).

### Stockage

Nouvelle colonne `embedding` (vector ou jsonb) sur `user_stories`. Si Supabase supporte pgvector (extension), utiliser le type `vector(1536)`. Sinon, stocker en jsonb et calculer la similarité en mémoire (acceptable pour < 500 US par équipe).

### Flow

```
Sync → pour chaque US nouvelle/modifiée :
  1. Calculer embedding (async, background)
  2. Comparer avec tous les embeddings existants du même team_id
  3. Si similarité > 0.85 → insérer dans `duplicate_pairs`
```

### Table `duplicate_pairs`

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `team_id` | uuid FK | |
| `story_a_id` | uuid FK → user_stories | |
| `story_b_id` | uuid FK → user_stories | |
| `similarity` | real | 0.0 à 1.0 |
| `status` | text | `'detected'` \| `'ignored'` |
| `created_at` | timestamptz | |

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Embedding + comparaison | ~6h |
| Phase 2 — Frontend badges + comparaison | ~5h |
| **Total** | **~11h** |

---

# Tasks

## Phase 1: Embedding + Comparaison (~6h)

- [ ] T001 [P] Ajouter méthode `embed(text)` sur l'interface `LLMClient` (optionnelle — `embedSupported(): boolean`)
- [ ] T002 [P] Implémenter `embed()` dans `OpenAIAdapter` — `client.embeddings.create({ model: 'text-embedding-3-small', input: text })`
- [ ] T003 Ajouter colonne `embedding` (jsonb) sur `user_stories` + migration
- [ ] T004 Table `duplicate_pairs` + migration
- [ ] T005 [P] Créer `apps/backend/src/services/duplicates/DuplicateDetectionService.ts` :
  - `computeEmbedding(storyId, teamId)` — calcule et stocke l'embedding
  - `detectDuplicates(teamId)` — compare tous les pairs, insère dans `duplicate_pairs`
  - `cosineSimilarity(a, b)` — calcul vectoriel
  - `getDuplicates(teamId)` — retourne les paires non ignorées
  - `ignorePair(pairId, teamId)` — marque comme ignorée
- [ ] T006 Intégrer le calcul d'embedding dans la sync (async, après la persistance des US)
- [ ] T007 Route `GET /api/duplicates` + `POST /api/duplicates/:id/ignore`
- [ ] T008 Tests unitaires : cosine similarity, détection, ignorage

## Phase 2: Frontend (~5h)

- [ ] T009 Badge "Doublons potentiels (N)" sur StoriesPage
- [ ] T010 Panel de doublons : liste des paires avec score, boutons Comparer / Ignorer
- [ ] T011 Vue comparaison côte à côte (deux colonnes avec les US)

---

# CLAUDE_TASK

Points clés :
- `embed()` optionnel sur `LLMClient` — seul OpenAI l'implémente en v1
- Embeddings stockés en jsonb (pas de pgvector pour simplifier)
- Calcul async post-sync pour ne pas ralentir l'import
- Cosine similarity > 0.85 = doublon potentiel
- Commit : `feat: 010-duplicate-detection — detect similar user stories`
