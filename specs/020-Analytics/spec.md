# Spécification — TestForge : Dashboard Analytics

> Tableau de bord analytics par équipe : scores, évolution, tests générés, temps économisé, répartition par projet.
> Spécification détaillée — 2026-03-26

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

TestForge analyse et génère des tests, mais aucune vue ne montre l'impact global sur l'équipe. Un CTO qui paie 99€/mois ne voit pas :
- Si la qualité des US de son équipe s'améliore au fil du temps
- Combien de temps de rédaction de tests son équipe économise
- Quel projet a les US les moins testables (et nécessite le plus d'attention)

Le lien "Analytics" est dans la sidebar mais la page n'existe pas. C'est un trou dans le produit qui affaiblit l'argumentaire commercial.

### Solution

Un dashboard analytics avec 4 sections :
1. **KPI cards** — score moyen, total analyses, total tests générés, temps économisé
2. **Distribution des scores** — combien d'US en vert (≥70), jaune (40-69), rouge (<40)
3. **Évolution dans le temps** — courbe du score moyen par semaine sur les 12 dernières semaines
4. **Répartition par projet** — score moyen et nombre de tests par connexion source

Plus un paramètre configurable par l'admin : "temps moyen pour écrire un test manuellement" (en minutes), utilisé pour calculer le temps économisé.

### Périmètre

**Inclus :**
- Page `/analytics` avec les 4 sections
- Nouvel endpoint `GET /api/analytics/dashboard` avec agrégats
- Colonne `manual_test_minutes` sur la table `teams` (défaut: 30 min)
- Endpoint `PUT /api/teams/me/test-estimate` pour configurer le temps manuel
- Filtre par connexion (réutilisation du hook `useConnectionFilter`)
- Charts via `recharts` (nouvelle dépendance frontend)
- Route + lien sidebar existant mis à jour

**Hors périmètre :**
- Export PDF/CSV des analytics
- Comparaison inter-équipes
- Alertes ou notifications basées sur les métriques
- Historique au-delà de 12 semaines

---

## 2. Personas

### Persona 1 — Thomas (CTO / Décideur)

| | |
|---|---|
| **Profil** | 45 ans, valide les investissements outils, peu technique |
| **Besoin principal** | Voir le ROI de TestForge en un coup d'œil |
| **Frustration** | Impossible de justifier l'abonnement sans métriques concrètes |
| **Objectif** | Un dashboard montrant "vos US ont gagné X points et vous avez économisé Y heures" |
| **Fréquence d'usage** | Mensuel (review outils) |

### Persona 2 — Sophie (QA Lead)

| | |
|---|---|
| **Profil** | 35 ans, gère la qualité sur 3 projets |
| **Besoin principal** | Identifier quel projet a les US les plus faibles pour prioriser les améliorations |
| **Frustration** | Doit parcourir chaque US individuellement pour avoir une vue d'ensemble |
| **Objectif** | Voir la distribution des scores et la répartition par projet |
| **Fréquence d'usage** | Hebdomadaire |

---

## 3. Epics & User Stories

### Epic 1 — Dashboard KPI et distribution

> Afficher les métriques clés et la distribution des scores en un coup d'œil.

#### US-1.1 : KPI cards en haut du dashboard

**En tant que** Thomas (CTO), **je veux** voir 4 indicateurs clés en haut de la page analytics **afin de** comprendre l'état global de mon équipe en 5 secondes.

**Critères d'acceptation :**
- [ ] Card 1 : Score moyen des US analysées (sur 100, avec badge couleur vert/jaune/rouge)
- [ ] Card 2 : Nombre total d'analyses effectuées
- [ ] Card 3 : Nombre total de tests générés (générations avec status = success)
- [ ] Card 4 : Temps estimé économisé (tests générés × temps manuel configurable)
- [ ] Chaque card affiche une valeur numérique principale + un label descriptif
- [ ] Les cards se mettent à jour quand le filtre connexion change

**Priorité :** 🔴 Haute

#### US-1.2 : Distribution des scores (donut chart)

**En tant que** Sophie (QA Lead), **je veux** voir combien d'US sont en zone verte, jaune et rouge **afin de** savoir si le backlog est globalement bien rédigé.

**Critères d'acceptation :**
- [ ] Donut chart avec 3 segments : vert (≥70), jaune (40-69), rouge (<40)
- [ ] Chaque segment affiche le nombre et le pourcentage
- [ ] Le centre du donut affiche le score moyen global
- [ ] Le chart se met à jour quand le filtre connexion change

**Priorité :** 🔴 Haute

### Epic 2 — Évolution et répartition

> Visualiser les tendances et comparer les projets.

#### US-2.1 : Courbe d'évolution des scores (line chart)

**En tant que** Thomas (CTO), **je veux** voir l'évolution du score moyen semaine par semaine **afin de** prouver que l'utilisation de TestForge améliore la qualité des US dans la durée.

**Critères d'acceptation :**
- [ ] Line chart sur 12 semaines glissantes
- [ ] Axe X : semaines (format "S12", "S13"...)
- [ ] Axe Y : score moyen (0-100)
- [ ] Ligne avec points cliquables : au hover, afficher le score exact + nombre d'analyses
- [ ] Si une semaine n'a aucune analyse, ne pas afficher de point (gap dans la courbe)
- [ ] Le chart se met à jour quand le filtre connexion change

**Priorité :** 🔴 Haute

#### US-2.2 : Répartition par projet (bar chart horizontal)

**En tant que** Sophie (QA Lead), **je veux** comparer les scores moyens et le nombre de tests entre mes projets **afin de** identifier lequel a besoin de plus d'attention.

**Critères d'acceptation :**
- [ ] Bar chart horizontal avec une barre par connexion
- [ ] Chaque barre montre le score moyen (couleur vert/jaune/rouge selon seuil)
- [ ] À droite de chaque barre : nombre d'analyses + nombre de tests
- [ ] Barres triées du meilleur score au plus faible
- [ ] Si un filtre connexion est actif, cette section montre la répartition par US au lieu de par connexion

**Priorité :** 🟡 Moyenne

### Epic 3 — Configuration du temps estimé

> Permettre à l'admin de personnaliser le calcul du temps économisé.

#### US-3.1 : Configurer le temps moyen par test

**En tant que** Thomas (CTO), **je veux** définir combien de minutes il faudrait pour écrire un test manuellement **afin que** le calcul de "temps économisé" reflète la réalité de mon équipe.

**Critères d'acceptation :**
- [ ] Un champ numérique "Temps moyen par test (minutes)" dans la section KPI ou dans les paramètres équipe
- [ ] Valeur par défaut : 30 minutes
- [ ] Seul l'admin peut modifier cette valeur
- [ ] Le temps économisé se recalcule immédiatement après modification
- [ ] Plage autorisée : 5 à 240 minutes

**Priorité :** 🟡 Moyenne

---

## 4. Features Détaillées

### F1 — Endpoint API analytics agrégé

**Description :** Un seul endpoint qui retourne toutes les métriques nécessaires au dashboard, calculées côté serveur.

**Entrées :** `teamId` (JWT), optionnel `connectionId` (query param).

**Sorties :**
```json
{
  "kpis": {
    "averageScore": 67,
    "totalAnalyses": 48,
    "totalGenerations": 35,
    "manualTestMinutes": 30,
    "timeSavedMinutes": 1050
  },
  "distribution": {
    "green": 22,
    "yellow": 18,
    "red": 8
  },
  "weeklyScores": [
    { "week": "2026-W11", "averageScore": 58, "count": 6 },
    { "week": "2026-W12", "averageScore": 63, "count": 8 }
  ],
  "byConnection": [
    {
      "connectionId": "uuid",
      "connectionName": "Backend API",
      "connectionType": "jira",
      "averageScore": 72,
      "analysisCount": 20,
      "generationCount": 15
    }
  ]
}
```

**Règles métier :**
- `averageScore` = moyenne des `scoreGlobal` de toutes les analyses de l'équipe (ou filtrées par connexion)
- `distribution` = count des analyses groupées par seuils (≥70, 40-69, <40)
- `weeklyScores` = score moyen par semaine ISO, 12 dernières semaines maximum
- `timeSavedMinutes` = `totalGenerations × manualTestMinutes`
- `byConnection` = agrégat par connexion source (via join analyses → userStories → sourceConnections)
- Si `connectionId` est fourni, les KPIs, distribution et weekly sont filtrés ; `byConnection` montre alors les US de cette connexion

### F2 — Configuration temps manuel

**Description :** Un champ sur la table `teams` + un micro-endpoint pour le modifier.

**Entrées :** `PUT /api/teams/me/test-estimate` avec `{ manualTestMinutes: number }`

**Sorties :** La valeur mise à jour.

**Règles métier :**
- Valeur par défaut : 30 minutes (colonne avec DEFAULT)
- Validation : min 5, max 240 (Zod)
- Seul un admin peut modifier (middleware `requireAdmin`)

---

## 5. Flux Utilisateur

### Flux principal — Consulter le dashboard

1. Thomas arrive sur la page Analytics (clic sidebar)
2. Le système charge les métriques agrégées en une requête
3. Les 4 KPI cards s'affichent en haut (score moyen, analyses, tests, temps économisé)
4. En dessous : donut de distribution (gauche) + courbe d'évolution (droite)
5. En bas : barres horizontales par projet
6. **Résultat :** Thomas voit que le score moyen est passé de 52 à 68 en 8 semaines — "ça marche !"

### Flux alternatif — Filtrer par projet

1. Sophie sélectionne "Backend API (Jira)" dans le dropdown
2. Toutes les métriques se mettent à jour pour ce projet uniquement
3. La section "par projet" se transforme en "par US" pour cette connexion
4. **Résultat :** Sophie identifie que 4 US du Backend sont en rouge

### Flux alternatif — Modifier le temps estimé

1. Thomas clique l'icône ⚙️ à côté de la card "Temps économisé"
2. Un petit formulaire inline apparaît avec la valeur actuelle (30 min)
3. Thomas change à 45 minutes et valide
4. La card se recalcule immédiatement (35 tests × 45 min = 26h économisées)
5. **Résultat :** Le calcul reflète la réalité de son équipe

---

## 6. Modèles de Données

### Modification du schéma : nouvelle colonne sur `teams`

```sql
ALTER TABLE teams ADD COLUMN manual_test_minutes SMALLINT NOT NULL DEFAULT 30;
```

### Aucune nouvelle table

Toutes les données analytics sont des agrégats sur les tables existantes (`analyses`, `generations`, `userStories`, `sourceConnections`).

---

## 7. Wireframes

### Dashboard analytics (layout complet)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Analytics    [Projet ▾]                                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐    │
│  │   67    │  │   48    │  │   35    │  │  17h 30min   ⚙️     │    │
│  │ Score   │  │Analyses │  │ Tests   │  │ Temps économisé     │    │
│  │ moyen   │  │         │  │ générés │  │ (30 min/test)       │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────────┘    │
│                                                                      │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │   Distribution       │  │  Évolution du score moyen          │   │
│  │                      │  │                                    │   │
│  │     ╭───╮            │  │  80 ─┬─────────────────────────    │   │
│  │    /  67 \           │  │      │         ╱──●──●             │   │
│  │   │ moyen │          │  │  60 ─┤    ●──●╱                   │   │
│  │    \     /           │  │      │   ╱                         │   │
│  │     ╰───╯            │  │  40 ─┤──●                          │   │
│  │  🟢 22  🟡 18  🔴 8 │  │      │                             │   │
│  │                      │  │      S8  S9 S10 S11 S12 S13       │   │
│  └──────────────────────┘  └────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Par projet                                                   │   │
│  │                                                               │   │
│  │  🔵 Backend API    ██████████████████░░  72    20 📊  15 ⚙️  │   │
│  │  🟣 Mobile App     █████████████░░░░░░  58    15 📊   8 ⚙️  │   │
│  │  🔵 Frontend       █████████░░░░░░░░░  45    13 📊  12 ⚙️  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Chargement du dashboard < 2s (1 requête API agrégée, pas de N+1) |
| UX | Charts animés au premier render (recharts defaults) |
| Accessibilité | Données numériques lisibles sans charts (KPI cards suffisent) |
| Responsive | Cards empilées sur mobile, charts full-width |
| Cohérence | Même palette de couleurs que les scores existants (vert ≥70, jaune 40-69, rouge <40) |
| Nouvelle dépendance | `recharts` — seule lib ajoutée, zéro config, tree-shakable |

---

> 📎 **Dépendance P1 :** Le hook `useConnectionFilter` est réutilisé pour le filtre par projet.
> 📎 **Dépendance plan.md :** Voir plan.md pour l'endpoint API et la stratégie de test.
