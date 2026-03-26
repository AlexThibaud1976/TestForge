# Spécification — TestForge : Filtre UI par Projet/Connexion

> Permettre aux utilisateurs de filtrer les user stories par connexion source (projet Jira/ADO) dans l'interface.
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

Un client TestForge peut connecter plusieurs projets Jira et/ou Azure DevOps à son équipe. Actuellement, la page User Stories affiche toutes les stories de toutes les connexions en vrac. Il n'y a aucun moyen visuel de savoir d'où vient une story, ni de filtrer par projet source. Quand une équipe a 3+ projets (ex: un projet frontend, un backend, un mobile), la liste devient inexploitable.

### Solution

Ajouter un sélecteur de connexion/projet sur la page User Stories permettant de filtrer l'affichage par source. Chaque story affiche un badge indiquant sa connexion d'origine. Le filtre persiste dans l'URL (query param) pour être partageable.

### Périmètre

**Inclus dans P1 :**
- Sélecteur dropdown "Projet" sur la page User Stories (filtre par `connectionId`)
- Badge visuel par story indiquant la connexion source (nom + type Jira/ADO)
- Persistance du filtre dans l'URL via query param `connectionId`
- Filtre combinable avec les filtres existants (search, status, sprint, label)
- Le bouton "Analyser tout le sprint" respecte le filtre connexion actif
- Route API existante `GET /api/user-stories` déjà compatible (param `connectionId` existant)

**Hors périmètre P1 :**
- Notion d'entité "Projet" dans TestForge (pas de nouvelle table)
- Filtrage des membres par projet/connexion (P2 post-démo)
- Admin par projet (P2 post-démo)
- Modification du modèle de données backend

---

## 2. Personas

### Persona 1 — Sophie (QA Lead)

| | |
|---|---|
| **Profil** | 35 ans, 8 ans d'expérience QA, à l'aise avec Jira |
| **Besoin principal** | Voir uniquement les stories du projet sur lequel elle travaille cette semaine |
| **Frustration** | Scrolle à travers 60+ stories de 3 projets pour trouver celles du sprint courant |
| **Objectif** | Filtrer par projet, analyser un sprint complet en un clic |
| **Fréquence d'usage** | Quotidien |

### Persona 2 — Marc (Tech Lead)

| | |
|---|---|
| **Profil** | 40 ans, supervise 2 projets (frontend React + API backend) |
| **Besoin principal** | Passer rapidement d'un projet à l'autre pour vérifier la qualité des US |
| **Frustration** | Pas de repère visuel pour distinguer les stories de ses deux projets |
| **Objectif** | Un sélecteur rapide + un badge par story pour s'orienter instantanément |
| **Fréquence d'usage** | 3-4 fois par semaine |

---

## 3. Epics & User Stories

### Epic 1 — Filtre par connexion source

> Permettre le filtrage et l'identification visuelle des user stories par projet/connexion d'origine.

#### US-1.1 : Sélecteur de connexion sur la page User Stories

**En tant que** Sophie (QA Lead), **je veux** sélectionner une connexion source dans un dropdown **afin de** ne voir que les stories du projet Jira/ADO sur lequel je travaille.

**Critères d'acceptation :**
- [ ] Un dropdown "Projet" apparaît dans la barre de filtres, à côté de "Tous statuts"
- [ ] Le dropdown liste toutes les connexions actives de l'équipe (nom + type)
- [ ] L'option par défaut est "Tous les projets" (aucun filtre)
- [ ] Sélectionner une connexion filtre la liste immédiatement (pas de bouton "Appliquer")
- [ ] Le compteur "X storys" se met à jour avec le nombre filtré
- [ ] Le filtre est cumulatif avec search, status, sprint et label

**Priorité :** 🔴 Haute

#### US-1.2 : Badge connexion sur chaque story

**En tant que** Marc (Tech Lead), **je veux** voir un badge indiquant la connexion source sur chaque story **afin de** identifier instantanément de quel projet elle provient.

**Critères d'acceptation :**
- [ ] Chaque carte story affiche un badge compact avec le nom de la connexion
- [ ] Le badge a une icône distincte selon le type (Jira = icône bleue, ADO = icône violette)
- [ ] Le badge est cliquable et applique le filtre par cette connexion
- [ ] Quand un filtre connexion est actif, le badge de la connexion filtrée est visuellement mis en avant

**Priorité :** 🔴 Haute

#### US-1.3 : Persistance du filtre dans l'URL

**En tant que** Sophie (QA Lead), **je veux** que le filtre connexion soit persisté dans l'URL **afin de** pouvoir partager un lien filtré avec mon équipe ou retrouver mon contexte après refresh.

**Critères d'acceptation :**
- [ ] Sélectionner une connexion ajoute `?connectionId=<uuid>` à l'URL
- [ ] Charger une URL avec ce param pré-sélectionne le filtre dans le dropdown
- [ ] Retirer le filtre ("Tous les projets") supprime le param de l'URL
- [ ] Les autres query params (search, status) sont préservés

**Priorité :** 🟡 Moyenne

#### US-1.4 : "Analyser tout le sprint" respecte le filtre

**En tant que** Sophie (QA Lead), **je veux** que le bouton "Analyser tout le sprint" ne traite que les stories du projet filtré **afin de** ne pas analyser les stories d'un autre projet par erreur.

**Critères d'acceptation :**
- [ ] Si un filtre connexion est actif, "Analyser tout le sprint" ne soumet que les stories visibles (filtrées)
- [ ] Un indicateur visuel confirme le nombre de stories qui seront analysées avant lancement
- [ ] Sans filtre actif, le comportement reste identique à l'existant (toutes les stories)

**Priorité :** 🟡 Moyenne

---

## 4. Features Détaillées

### F1 — Dropdown "Projet" (Sélecteur de connexion)

**Description :** Un composant dropdown ajouté à la barre de filtres existante de la page User Stories. Il affiche la liste des connexions source actives de l'équipe avec leur type (icône Jira ou ADO) et leur nom.

**Entrées :** Liste des connexions actives via `GET /api/connections` (route existante).

**Sorties :** Filtre la requête `GET /api/user-stories?connectionId=<uuid>` (param déjà supporté par l'API).

**Règles métier :**
- Seules les connexions avec `isActive: true` apparaissent dans le dropdown
- Le dropdown se rafraîchit quand on revient sur la page (pas de cache périmé)
- Si une connexion est désactivée alors qu'elle est filtrée, revenir à "Tous les projets"

**Cas limites :**
- 0 connexions → le dropdown est masqué (pas de filtre possible)
- 1 seule connexion → le dropdown est visible mais pas de valeur ajoutée majeure ; on l'affiche quand même pour la cohérence
- Connexion supprimée entre-temps → le filtre URL pointe vers un ID invalide → fallback "Tous les projets" + notification discrète

### F2 — Badge connexion source

**Description :** Un badge compact affiché sur chaque carte de user story dans la liste. Format : `[icône type] Nom connexion`. Le badge utilise un code couleur par type de source.

**Entrées :** Le champ `connectionId` de chaque user story, résolu vers le nom et type de la connexion.

**Sorties :** Élément visuel non-bloquant sur la carte.

**Règles métier :**
- Le nom affiché est tronqué à 20 caractères + "…" si plus long
- Le badge est toujours visible, même quand un filtre est actif (pour confirmer le contexte)
- Stories sans `connectionId` (import manuel futur) → badge "—" grisé

**Cas limites :**
- Connexion supprimée mais story encore en base → afficher "Projet supprimé" en grisé

---

## 5. Flux Utilisateur

### Flux principal — Filtrer par projet

1. L'utilisateur arrive sur la page User Stories
2. Le système affiche toutes les stories (toutes connexions) avec badges connexion
3. L'utilisateur clique sur le dropdown "Projet"
4. Le système affiche la liste des connexions actives (nom + icône type)
5. L'utilisateur sélectionne "Backend API (Jira)"
6. Le système filtre la liste, met à jour le compteur, ajoute `?connectionId=xxx` à l'URL
7. **Résultat :** Seules les stories de "Backend API" sont affichées

### Flux alternatif — Clic sur badge

1. L'utilisateur voit une story avec le badge "Mobile App (ADO)"
2. L'utilisateur clique sur le badge
3. Le système applique le filtre par cette connexion (identique à la sélection dropdown)
4. **Résultat :** Le dropdown se met à jour pour afficher "Mobile App (ADO)" comme sélection active

### Flux alternatif — URL partagée

1. L'utilisateur reçoit un lien : `https://app.testforge.dev/stories?connectionId=abc-123`
2. Le système charge la page avec le filtre pré-appliqué
3. Le dropdown affiche la connexion correspondante comme active
4. **Résultat :** L'utilisateur voit directement les stories du projet partagé

### Flux alternatif — Connexion invalide dans l'URL

1. L'utilisateur charge une URL avec un `connectionId` qui n'existe plus
2. Le système détecte que la connexion n'existe pas dans les données chargées
3. Le système fallback sur "Tous les projets" et affiche un toast d'info
4. **Résultat :** L'utilisateur voit toutes les stories avec un message "Le filtre projet n'est plus valide"

---

## 6. Modèles de Données

Aucun changement au modèle de données. Cette feature utilise exclusivement les structures existantes :

```typescript
// Déjà existant dans shared-types
interface SourceConnection {
  id: string;
  teamId: string;
  type: 'jira' | 'azure_devops';
  name: string;
  baseUrl: string;
  projectKey: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

// Déjà existant — le champ connectionId est la clé du filtre
interface UserStory {
  id: string;
  teamId: string;
  connectionId: string | null; // ← clé du filtre
  externalId: string;
  title: string;
  description: string | null;
  // ...
}
```

Le frontend a besoin d'un lookup `connectionId → { name, type }` pour afficher les badges. Ce lookup est construit côté client à partir des données de `GET /api/connections`.

---

## 7. Wireframes

### Barre de filtres (avec nouveau sélecteur Projet)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔍 Rechercher...                    │ Tous statuts ▾ │ Projet ▾  │ ... │
│                                      │                │ ┌────────────┐  │
│                                      │                │ │Tous projets│  │
│                                      │                │ │🔵 Backend  │  │
│                                      │                │ │🔵 Frontend │  │
│                                      │                │ │🟣 Mobile   │  │
│                                      │                │ └────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Carte User Story (avec badge connexion)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☐  TF-DEMO-1   To Do                                                │
│    Connexion utilisateur avec email et mot de passe                  │
│    En tant qu'utilisateur enregistré, je veux me connecter...        │
│    [auth] [v1] [sprint-1]                     🔵 Backend API (Jira)  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Le filtre s'applique en < 200ms (filtrage côté client sur données déjà chargées) |
| UX | Le dropdown se charge au même moment que la page (pas de loading séparé) |
| Accessibilité | Le dropdown est navigable au clavier (Tab, Enter, Escape) |
| Responsive | Le sélecteur est masqué sur mobile < 640px, remplacé par un bouton filtre modal |
| Rétrocompatibilité | Les URLs sans `connectionId` continuent à fonctionner identiquement |
| i18n | Labels "Tous les projets", "Projet" prêts pour traduction (même si FR uniquement pour la démo) |

---

> 📎 **Dépendance plan.md :** Voir plan.md pour l'approche technique et la stratégie de test.
> 📎 **Dépendance existante :** L'API `GET /api/user-stories?connectionId=` et `GET /api/connections` sont déjà implémentées et testées.
