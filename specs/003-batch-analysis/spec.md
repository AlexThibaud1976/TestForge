# Feature Specification: Batch Analysis

**Feature Branch**: `003-batch-analysis`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Permettre d'analyser toutes les US d'un sprint (ou d'une sélection) en un seul clic, avec un dashboard de scores comparatifs trié du plus faible au plus fort. Le QA lead identifie instantanément les US problématiques avant le sprint planning.

### Problème

Aujourd'hui, l'analyse se fait US par US. Un QA en début de sprint avec 10-15 US doit cliquer "Analyser" 15 fois et naviguer entre les pages pour comparer les scores. C'est fastidieux et ça rend impossible la vue d'ensemble "qualité du sprint".

### Solution

Un bouton "Analyser le sprint" sur la page Stories qui lance N analyses en parallèle (avec rate limiting LLM) et affiche un tableau de bord de scores comparatifs. Les US à faible score sont identifiées visuellement pour un traitement prioritaire en refinement.

---

## User Stories

### US-BA-1 — Lancer une analyse en lot (Priority: P1)

Sarah (QA) ouvre la page Stories filtrée sur le sprint courant. Elle sélectionne les US qu'elle veut analyser (ou toutes) et clique "Analyser la sélection". Les analyses sont lancées en parallèle avec une barre de progression.

**Independent Test**: Sélectionner 5 US → cliquer "Analyser la sélection" → vérifier que 5 analyses sont créées avec des scores.

**Acceptance Scenarios**:

1. **Given** 10 US dans le sprint courant, **When** Sarah clique "Analyser tout le sprint", **Then** les 10 analyses sont lancées et une barre de progression montre l'avancement (3/10, 5/10...).
2. **Given** 3 US déjà analysées (cache < 24h), **When** Sarah lance le batch, **Then** seules les 7 US non analysées sont envoyées au LLM (les 3 en cache sont réutilisées).
3. **Given** un rate limit LLM atteint, **When** une analyse échoue, **Then** les autres continuent et l'erreur est affichée sur l'US concernée avec un bouton "Réessayer".
4. **Given** une sélection partielle (5 US sur 10), **When** Sarah lance le batch, **Then** seules les 5 US sélectionnées sont analysées.

---

### US-BA-2 — Dashboard de scores comparatifs (Priority: P1)

Après le batch, Sarah voit un tableau de bord avec les scores de toutes les US, triés du plus faible au plus fort. Les US à score < 40 sont en rouge, 40-70 en orange, > 70 en vert.

**Independent Test**: Lancer un batch de 8 US → vérifier que le dashboard affiche les 8 scores triés avec les bons codes couleur.

**Acceptance Scenarios**:

1. **Given** un batch terminé, **When** Sarah consulte le dashboard, **Then** les US sont listées avec : titre, score global, score par dimension (barres), statut (rouge/orange/vert).
2. **Given** le dashboard affiché, **When** Sarah clique sur une US, **Then** elle est redirigée vers le détail de l'analyse (page existante).
3. **Given** le dashboard, **When** Sarah trie par dimension (ex: testabilité), **Then** la liste se réordonne par cette dimension.
4. **Given** le dashboard, **When** Sarah exporte en CSV, **Then** un fichier CSV avec les scores de toutes les US est téléchargé.

---

### US-BA-3 — Score moyen du sprint (Priority: P2)

Le dashboard affiche un score moyen du sprint et une répartition (N US rouges, N oranges, N vertes). Cela donne une vue macro de la qualité du backlog.

**Independent Test**: Batch de 10 US → vérifier le score moyen et la répartition affichés.

**Acceptance Scenarios**:

1. **Given** un batch terminé avec scores [32, 45, 55, 68, 72, 78, 82, 85], **When** le dashboard s'affiche, **Then** le score moyen est 64.6 et la répartition est 1 rouge / 3 orange / 4 vert.
2. **Given** un sprint avec 0 US rouge, **When** le dashboard s'affiche, **Then** un message "Sprint prêt pour les tests" est affiché.

---

## Edge Cases

- US sans description ni AC → score 0 ou refusé avec message
- Sprint avec 50+ US → pagination + warning "analyse longue attendue"
- LLM timeout sur une US → les autres continuent, retry possible
- Deux batchs lancés simultanément → le second est rejeté avec message "analyse en cours"

---

## Requirements

### Functional Requirements

- **FR-BA-001**: Le système DOIT supporter l'analyse en lot de N user stories en un seul appel.
- **FR-BA-002**: Les analyses DOIVENT être exécutées en parallèle avec un maximum de 3 appels LLM simultanés (rate limiting).
- **FR-BA-003**: Le cache d'analyse existant (< 24h) DOIT être réutilisé pour les US déjà analysées.
- **FR-BA-004**: Le dashboard DOIT afficher les scores triés et colorés (rouge < 40, orange 40-70, vert > 70).
- **FR-BA-005**: Le dashboard DOIT permettre le tri par dimension et l'export CSV.
- **FR-BA-006**: Le score moyen du sprint DOIT être calculé et affiché.
- **FR-BA-007**: Les erreurs individuelles NE DOIVENT PAS bloquer le reste du batch.

### Non-Functional Requirements

- **Performance**: batch de 10 US < 60 secondes (parallélisme 3)
- **Plan**: disponible sur Starter et Pro
