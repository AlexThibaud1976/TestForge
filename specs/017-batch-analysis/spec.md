# Spécification — TestForge : Analyse Batch Sprint Améliorée

> Analyser un sprint complet en un clic avec progression temps réel et résumé des scores.
> Spécification détaillée — 2026-03-26

---

## 1. Vue d'Ensemble

### Problème

Le bouton "Analyser tout le sprint" existe dans le screenshot mais l'UX est basique : il lance les analyses une par une sans feedback, pas de barre de progression, pas de résumé à la fin. Quand on analyse 10 US, l'utilisateur attend sans savoir où en est le processus. De plus, l'API actuelle `POST /api/analyses` ne traite qu'une seule US à la fois — le batch est géré côté frontend en boucle séquentielle.

### Solution

Un endpoint backend batch `POST /api/analyses/batch` qui accepte un tableau d'IDs, traite les US en parallèle (max 3 concurrents pour respecter les rate limits LLM), et retourne les résultats progressivement via Supabase Realtime. Côté frontend, un modal de progression montre chaque US en cours/terminée avec son score, et un résumé final (distribution, score moyen, US critiques).

### Périmètre

**Inclus :**
- Endpoint `POST /api/analyses/batch` avec array d'`userStoryIds`
- Modal de progression temps réel (barre de progression, score par US au fur et à mesure)
- Résumé final : distribution (vert/jaune/rouge), score moyen, top 3 US à améliorer
- Le batch respecte le filtre connexion actif (n'analyse que les stories visibles)
- Concurrence limitée à 3 analyses simultanées (rate limit LLM)

**Hors périmètre :**
- Annulation en cours de batch
- Configuration du parallélisme
- Export du résumé

---

## 2. Personas

### Sophie (QA Lead)
Veut analyser les 12 US du sprint courant en un clic et obtenir un rapport de qualité instantané pour la réunion de sprint planning.

---

## 3. User Stories

#### US-1.1 : Lancer une analyse batch

**En tant que** Sophie, **je veux** cliquer "Analyser tout le sprint" et voir les 12 US analysées en ~30 secondes **afin de** avoir un rapport de qualité complet pour le planning.

**Critères d'acceptation :**
- [ ] Le bouton soumet toutes les stories visibles (filtrées par connexion/statut/search)
- [ ] Un modal s'ouvre avec la liste des US et une barre de progression
- [ ] Chaque US affiche son statut : ⏳ en attente → 🔄 en cours → ✅ score ou ❌ erreur
- [ ] Le score de chaque US apparaît en temps réel dès qu'il est disponible
- [ ] La barre de progression se remplit au fur et à mesure (X/12)

#### US-1.2 : Résumé post-batch

**En tant que** Sophie, **je veux** voir un résumé des scores à la fin du batch **afin de** identifier immédiatement les US problématiques.

**Critères d'acceptation :**
- [ ] Après le dernier résultat, le modal affiche un résumé :
  - Score moyen du sprint
  - Distribution : X en vert, Y en jaune, Z en rouge
  - Top 3 US avec le score le plus bas (cliquables → navigation vers le détail)
- [ ] Un bouton "Fermer" ferme le modal et retourne à la liste (scores maintenant visibles sur chaque carte)

---

## 4. Features Détaillées

### F1 — Endpoint batch

**Entrées :** `{ userStoryIds: string[] }` (max 50)
**Sorties :** `{ batchId: string, total: number }` — les résultats arrivent via Realtime
**Traitement :** `Promise.allSettled` avec pool de 3 concurrents (via un simple sémaphore). Chaque analyse terminée met à jour la row `analyses` en DB → Supabase Realtime push.

### F2 — Modal de progression

**Composant** `BatchAnalysisModal` : modal overlay plein écran avec liste scrollable des US, barre de progression animée, résumé final conditionnel.

---

## 5. Wireframes

```
┌──────────────────────────────────────────────────────┐
│  Analyse en cours — 7/12 US                          │
│  ████████████████████░░░░░░░░  58%                   │
│                                                      │
│  ✅ TF-42  Connexion utilisateur          78/100     │
│  ✅ TF-43  Réinitialisation mdp           85/100     │
│  ✅ TF-44  Ajouter au panier              62/100     │
│  ✅ TF-45  Recherche produits             71/100     │
│  ✅ TF-46  Historique commandes           45/100     │
│  ✅ TF-47  Profil utilisateur             55/100     │
│  🔄 TF-48  Notifications push            en cours   │
│  🔄 TF-49  Gestion adresses              en cours   │
│  🔄 TF-50  Wishlist                       en cours   │
│  ⏳ TF-51  Filtres avancés               en attente │
│  ⏳ TF-52  Mode sombre                    en attente │
│  ⏳ TF-53  Export CSV                     en attente │
├──────────────────────────────────────────────────────┤
│  (Résumé affiché quand 12/12)                        │
│  Score moyen : 67/100 🟡                             │
│  🟢 5  🟡 4  🔴 3                                    │
│  ⚠️ À améliorer : TF-46 (45), TF-47 (55), TF-44 (62)│
│                                        [Fermer]      │
└──────────────────────────────────────────────────────┘
```

---

## 6. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | 12 US analysées en < 60s (3 en parallèle × ~8s chacune) |
| Fiabilité | Si une US échoue, les autres continuent (resilient) |
| UX | Le modal bloque les interactions derrière mais reste scrollable |

---

> 📎 **Dépendance :** Supabase Realtime (déjà utilisé pour les générations — hook `useRealtimeRow` existant).
