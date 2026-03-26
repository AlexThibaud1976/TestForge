# TestForge — Guide Utilisateur

## User Stories

### Filtrer par projet / connexion

La page **User Stories** (`/stories`) affiche toutes les stories synchronisées depuis vos connexions Jira et Azure DevOps.

#### Dropdown "Tous les projets"

Lorsque vous avez au moins une connexion active configurée, un sélecteur apparaît dans la barre de filtres :

- **🔵 Jira** — connexions Jira Cloud / Server
- **🟣 Azure DevOps** — connexions ADO

Sélectionner une connexion restreint la liste aux stories issues de ce projet uniquement. Le compteur en haut ("X stories") se met à jour en temps réel.

#### Filtre partageable via l'URL

Le filtre connexion est synchronisé avec l'URL :

```
/stories?connectionId=<uuid-de-la-connexion>
```

Vous pouvez **copier et partager ce lien** : vos coéquipiers verront directement les stories filtrées. Le filtre est également restauré lors d'un rechargement de la page.

#### Badge connexion sur chaque story card

Chaque story affiche un badge compact en bas à droite indiquant sa connexion source (icône + nom tronqué).

- **Cliquer sur le badge** active automatiquement le filtre pour cette connexion.
- Si la connexion a été supprimée, le badge affiche « Projet supprimé » en italique.

#### Bouton "Analyser tout le sprint"

Lorsqu'un filtre connexion est actif, le bouton d'analyse batch indique le nombre de stories concernées :

```
📊 Analyser connexion (42 stories)
```

L'analyse ne portera que sur les stories visibles dans la connexion filtrée.

---

### Autres filtres

| Filtre | Comportement |
|--------|-------------|
| Recherche textuelle | Filtre sur titre + description (côté serveur) |
| Statut | Filtre sur le statut Jira/ADO |
| Sprint | Filtre local approximatif sur les labels et le titre |
| Label | Filtre local sur les labels |

Les filtres sont **cumulables** : vous pouvez combiner connexion + statut + recherche.

---

## Dashboard Analytics

La page **Dashboard** (`/analytics`) offre une vue d'ensemble de la qualité et du ROI sur TestForge.

### Sections du dashboard

**KPI Cards** — 4 indicateurs en haut de page :
- Score moyen (badge vert ≥70 / jaune 40-69 / rouge <40)
- Nombre d'analyses effectuées
- Nombre de tests générés
- Temps économisé (calculé sur la base du temps estimé par test)

**Distribution des scores** — Donut chart avec 3 segments :
- 🟢 Bons (score ≥70)
- 🟡 Moyens (score 40-69)
- 🔴 Faibles (score <40)

**Évolution hebdomadaire** — Courbe du score moyen sur les 12 dernières semaines.

**Répartition par projet** — Barres horizontales, une par connexion Jira/ADO, triées par score décroissant.

### Filtrer par projet

Le sélecteur en haut à droite filtre toutes les sections par connexion (🔵 Jira / 🟣 Azure DevOps). Le filtre est synchronisé avec l'URL.

### Configurer le temps estimé par test

Cliquez sur ⚙️ dans la carte "Temps économisé" pour ouvrir le formulaire de configuration. Entrez le nombre de minutes estimées pour écrire un test manuellement (min : 5, max : 240). Seuls les administrateurs d'équipe peuvent modifier cette valeur.

---

## Historique

### Vue arborescente

La page **Historique** (`/history`) affiche toutes vos générations de tests sous forme d'arbre à trois niveaux :

```
🔵 Backend Jira          ← Niveau 1 : Connexion (projet)
  └─ PROJ-42 Login       ← Niveau 2 : User Story
       └─ gen-abc1234    ← Niveau 3 : Génération (carte)
```

Chaque niveau est **collapsible** : cliquez sur l'en-tête pour plier/déplier. La première connexion est ouverte par défaut.

### Filtrer par projet

Un sélecteur en haut à droite permet de filtrer l'historique par connexion (🔵 Jira / 🟣 Azure DevOps). L'URL est mise à jour pour permettre le partage du filtre.

### Carte de génération

Chaque génération affiche :

- Statut **✓ Succès** ou **✗ Erreur**
- Framework + langage (ex. `Playwright · Typescript`)
- Modèle LLM utilisé
- Durée et horodatage
- **Voir US** → ouvre directement la user story source
- **⬇ ZIP** → télécharge les fichiers générés (uniquement si succès)

### Générations orphelines

Si une génération n'est pas liée à une user story ou à une connexion (données archivées ou supprimées), elle apparaît dans le groupe **Non liées** (⚪) en bas de liste.

---

### Synchronisation

Cliquez sur **↻ Nom du projet** pour lancer une synchronisation depuis Jira ou Azure DevOps. Une boîte de dialogue permet de restreindre la synchronisation à un sprint, des statuts ou des labels spécifiques.
