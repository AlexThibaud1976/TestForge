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

### Synchronisation

Cliquez sur **↻ Nom du projet** pour lancer une synchronisation depuis Jira ou Azure DevOps. Une boîte de dialogue permet de restreindre la synchronisation à un sprint, des statuts ou des labels spécifiques.
