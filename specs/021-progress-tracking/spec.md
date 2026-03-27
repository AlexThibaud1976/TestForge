# Spécification — 008 Progress Tracking (Analyse & Génération)

> Remplacer les spinners par une progression par étapes + estimation de temps fiable
> Spécification détaillée — 27 mars 2026

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

Aujourd'hui, les phases d'analyse qualité et de génération de code affichent un simple spinner CSS rotatif avec un texte statique ("Analyse en cours...", "Génération en cours... ~25 secondes"). L'utilisateur n'a aucune visibilité sur ce qui se passe réellement. Si le LLM est lent ou rapide, le temps affiché est déconnecté de la réalité. Le résultat : incertitude, impression d'application figée, et frustration si le temps estimé est dépassé.

### Solution

Remplacer les spinners par un indicateur de progression en 3 étapes nommées (Préparation → Appel LLM → Finalisation) accompagné d'une barre de temps estimé basée sur les durées historiques réelles par provider/modèle. Les estimations s'affinent au fil du temps grâce au stockage de `duration_ms` sur chaque opération.

### Périmètre

**Inclus :**
- Refactor de l'analyse en mode asynchrone (comme la génération aujourd'hui)
- Progression par étapes pour l'analyse unitaire (StoryDetailPage)
- Progression par étapes pour la génération unitaire (StoryDetailPage)
- Stockage de `duration_ms` sur les analyses (nouveau)
- Calcul de la médiane historique par provider/model pour les estimations
- Composant frontend réutilisable `ProgressTracker`

**Hors périmètre (v1) :**
- Batch analysis (feature 005 — a déjà son propre suivi X/N)
- Streaming SSE des tokens LLM
- Estimation par taille de US (corrélation tokens)
- Barre de progression pour d'autres opérations (sync, writeback, etc.)

---

## 2. Personas

### Sarah — QA Engineer

| | |
|---|---|
| **Profil** | 28 ans, 4 ans d'XP QA, utilise Playwright quotidiennement |
| **Besoin principal** | Savoir si l'opération avance ou est bloquée |
| **Frustration** | Un spinner figé pendant 20+ secondes → "est-ce que c'est planté ?" |
| **Objectif** | Voir que le système travaille avec un temps réaliste |
| **Fréquence d'usage** | Quotidienne |

### Marc — Product Owner

| | |
|---|---|
| **Profil** | 35 ans, non-technique, utilise TestForge pour valider la qualité des US |
| **Besoin principal** | Lancer une analyse et savoir combien de temps attendre |
| **Frustration** | Ne sait pas si 10s ou 30s est normal |
| **Objectif** | Estimation fiable pour organiser son temps |
| **Fréquence d'usage** | Hebdomadaire |

---

## 3. Epics & User Stories

### Epic 1 — Analyse asynchrone avec progression

> Transformer l'analyse synchrone en flux asynchrone avec suivi d'étapes en temps réel

#### US-1.1 : Voir les étapes de l'analyse en cours

**En tant que** Sarah (QA), **je veux** voir l'étape en cours de mon analyse (Préparation / Appel LLM / Finalisation) **afin de** savoir que le système travaille activement.

**Critères d'acceptation :**
- [ ] 3 étapes affichées : Préparation, Appel LLM, Finalisation
- [ ] L'étape active est visuellement distincte (icône animée, couleur)
- [ ] Les étapes terminées ont un check vert
- [ ] La transition entre étapes est fluide (pas de saut brutal)

**Priorité :** 🔴 Haute

#### US-1.2 : Voir le temps écoulé vs temps estimé

**En tant que** Marc (PO), **je veux** voir "12s / ~18s estimées" avec une barre de progression **afin de** savoir combien de temps il reste.

**Critères d'acceptation :**
- [ ] Affichage du temps écoulé (compteur live en secondes)
- [ ] Affichage du temps estimé basé sur la médiane historique du provider/model
- [ ] Barre de progression proportionnelle au ratio écoulé/estimé
- [ ] Si le temps estimé est dépassé, la barre reste à ~95% et le texte passe à "Un peu plus long que d'habitude..."
- [ ] Fallback sur une valeur par défaut (15s analyse, 25s génération) si aucun historique

**Priorité :** 🔴 Haute

#### US-1.3 : Refactor de l'analyse en mode async

**En tant que** développeur, **je veux** que l'analyse suive le même pattern async que la génération **afin de** pouvoir émettre des étapes intermédiaires via Supabase Realtime.

**Critères d'acceptation :**
- [ ] `POST /api/analyses` retourne immédiatement `{ id, status: 'pending' }`
- [ ] Le traitement se fait en background (comme `processGeneration`)
- [ ] Le statut est mis à jour en DB → Supabase Realtime notifie le frontend
- [ ] La colonne `status` est ajoutée à la table `analyses` (pending/processing/success/error)
- [ ] La colonne `duration_ms` est ajoutée à la table `analyses`
- [ ] Le cache 24h est préservé (si cache hit, retour immédiat sans créer de pending)
- [ ] Rétrocompatibilité : le batch analysis (005) continue de fonctionner

**Priorité :** 🔴 Haute

### Epic 2 — Progression sur la génération

> Ajouter le même suivi d'étapes sur la génération existante

#### US-2.1 : Voir les étapes de la génération en cours

**En tant que** Sarah (QA), **je veux** voir l'étape en cours de ma génération (Préparation / Appel LLM / Finalisation) **afin de** différencier les phases du processus.

**Critères d'acceptation :**
- [ ] Mêmes 3 étapes que l'analyse
- [ ] Le composant `ProgressTracker` est réutilisé
- [ ] L'étape "Finalisation" inclut le parsing + sauvegarde des fichiers
- [ ] Temps estimé basé sur l'historique des générations (déjà `duration_ms` en DB)

**Priorité :** 🔴 Haute

### Epic 3 — Estimations historiques

> Stocker et exploiter les durées pour des estimations de plus en plus fiables

#### US-3.1 : Calcul de l'estimation médiane par provider/model

**En tant que** système, **je veux** calculer la médiane des 20 dernières durées par provider/model et par type d'opération (analyse/génération) **afin de** fournir une estimation réaliste.

**Critères d'acceptation :**
- [ ] Endpoint `GET /api/estimates?type=analysis&provider=openai&model=gpt-4o` retourne `{ estimatedMs, sampleSize }`
- [ ] Calcul basé sur les 20 dernières opérations réussies de la même équipe
- [ ] Fallback sur les valeurs globales (toutes équipes) si < 5 opérations pour cette équipe
- [ ] Fallback hardcodé si < 5 opérations globales (15000ms analyse, 25000ms génération)
- [ ] Le frontend récupère l'estimation au moment du lancement

**Priorité :** 🟡 Moyenne

---

## 4. Features Détaillées

### F1 — Composant ProgressTracker

**Description :** Composant React réutilisable qui affiche 3 étapes avec leur statut (pending/active/done), une barre de temps, et un compteur.

**Entrées :**
- `steps`: tableau de 3 étapes `{ label: string, status: 'pending' | 'active' | 'done' }`
- `estimatedMs`: temps total estimé en millisecondes
- `startedAt`: timestamp ISO du démarrage
- `error`: message d'erreur optionnel

**Sorties :**
- Affichage visuel des 3 étapes avec indicateurs
- Barre de progression temps avec format "Xs / ~Ys"
- Message adaptatif si dépassement de l'estimation

**Règles métier :**
- La barre avance proportionnellement au ratio `elapsed / estimated`
- La barre ne dépasse jamais 95% tant que le statut n'est pas `success`
- Si `elapsed > estimated * 1.5`, afficher "Un peu plus long que d'habitude..."
- Si `elapsed > estimated * 3`, afficher "Vérification en cours..." (seuil d'alerte)

**Cas limites :**
- Aucun historique → fallback sur valeurs par défaut, afficher "~15s (estimation)"
- Erreur pendant le traitement → barre figée, message d'erreur affiché, étape en cours marquée en erreur
- Cache hit sur l'analyse → pas de progression affichée, résultat instantané

### F2 — Colonnes progress_step sur analyses et generations

**Description :** Colonne `progress_step` de type `text` ajoutée sur les deux tables, mise à jour par le backend à chaque transition d'étape.

**Valeurs possibles :** `'preparing'`, `'calling_llm'`, `'finalizing'`, `null` (terminé)

**Règle :** Le frontend écoute les changements via `useRealtimeRow` (existant) et met à jour le composant `ProgressTracker`.

---

## 5. Flux Utilisateur

### Flux principal — Analyse avec progression

1. L'utilisateur clique sur "Analyser" dans StoryDetailPage
2. Le frontend appelle `POST /api/analyses { userStoryId }`
3. Le backend vérifie le cache → si cache hit, retourne `201` avec l'analyse complète (flux court-circuité, pas de pending)
4. Si cache miss : crée un record `pending`, retourne `{ id, status: 'pending' }` immédiatement
5. Le frontend détecte `status: 'pending'` → affiche le `ProgressTracker` et souscrit via Realtime
6. Le backend met à jour `progress_step = 'preparing'` en DB
7. Le frontend reçoit l'update → étape 1 active
8. Le backend met à jour `progress_step = 'calling_llm'`
9. Le frontend reçoit l'update → étape 2 active, compteur de temps commence
10. Le backend termine l'appel LLM, met à jour `progress_step = 'finalizing'`
11. Le frontend reçoit l'update → étape 3 active
12. Le backend met à jour `status = 'success'`, `progress_step = null`, `duration_ms = X`
13. Le frontend reçoit l'update → toutes les étapes vertes, résultat affiché

### Flux alternatif — Cache hit

1. L'utilisateur clique sur "Analyser"
2. Le backend détecte un cache valide → retourne directement le résultat avec `status: 'success'`
3. Le frontend affiche le résultat immédiatement (pas de progression)

### Flux alternatif — Erreur LLM

1. Étapes 1 à 8 du flux principal
2. L'appel LLM échoue
3. Le backend met à jour `status = 'error'`, `progress_step = null`
4. Le frontend reçoit l'update → étape 2 marquée en erreur, message d'erreur affiché, bouton "Réessayer"

### Flux principal — Génération avec progression

1. L'utilisateur clique sur "Générer" (déjà async aujourd'hui)
2. `POST /api/generations` crée le record `pending` (existant)
3. Le backend émet `progress_step = 'preparing'` → `'calling_llm'` → `'finalizing'`
4. Le frontend écoute via Realtime (existant) et alimente le `ProgressTracker`
5. À `status = 'success'`, affichage du résultat

---

## 6. Modèles de Données

### Modifications de la table `analyses`

```typescript
// Nouvelles colonnes
interface AnalysisExtension {
  status: 'pending' | 'processing' | 'success' | 'error'; // NEW — défaut 'success' pour les existantes
  progressStep: 'preparing' | 'calling_llm' | 'finalizing' | null; // NEW
  durationMs: number | null; // NEW — durée totale en ms
}
```

### Modification de la table `generations`

```typescript
// Nouvelle colonne
interface GenerationExtension {
  progressStep: 'preparing' | 'calling_llm' | 'finalizing' | null; // NEW
  // status et durationMs existent déjà
}
```

### Modèle d'estimation

```typescript
interface DurationEstimate {
  estimatedMs: number;
  sampleSize: number; // nombre d'opérations utilisées pour le calcul
  source: 'team' | 'global' | 'default'; // d'où vient l'estimation
}
```

---

## 7. Wireframes

### ProgressTracker — État "Appel LLM en cours"

```
┌────────────────────────────────────────────────┐
│                                                │
│  ✓ Préparation    ◉ Appel LLM    ○ Résultat   │
│                                                │
│  ████████████████████░░░░░░░░░░  12s / ~18s    │
│                                                │
└────────────────────────────────────────────────┘
```

### ProgressTracker — État "Dépassement"

```
┌────────────────────────────────────────────────┐
│                                                │
│  ✓ Préparation    ◉ Appel LLM    ○ Résultat   │
│                                                │
│  ██████████████████████████████░  28s / ~18s    │
│  Un peu plus long que d'habitude...            │
│                                                │
└────────────────────────────────────────────────┘
```

### ProgressTracker — État "Terminé"

```
┌────────────────────────────────────────────────┐
│                                                │
│  ✓ Préparation    ✓ Appel LLM    ✓ Résultat   │
│                                                │
│  ██████████████████████████████  ✓ 16s          │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 8. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | La transition d'étape doit apparaître en < 500ms après la mise à jour DB |
| Performance | Le compteur de temps doit se rafraîchir à 1Hz (pas de jank visuel) |
| Rétrocompatibilité | Les analyses existantes (sans `status`) doivent continuer à s'afficher normalement |
| Rétrocompatibilité | Le batch analysis (005) doit continuer à fonctionner sans modification |
| Fiabilité | Si la souscription Realtime échoue, fallback sur un polling toutes les 3s |
| UX | Pas de flash blanc entre le clic et l'affichage du premier état du tracker |
| Migration | La migration doit setter `status = 'success'` sur toutes les analyses existantes |
