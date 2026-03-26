# Spécification — TestForge : Comparaison Avant/Après Analyse

> Diff visuel entre l'US originale et la version améliorée par l'IA, avec changements surlignés.
> Spécification détaillée — 2026-03-26

---

## 1. Vue d'Ensemble

### Problème

Après une analyse, TestForge produit une "version améliorée" de l'US. Actuellement, l'utilisateur peut basculer entre "US originale" et "Version améliorée" via un toggle — mais il voit l'un OU l'autre, jamais les deux côte à côte. Il est impossible de voir exactement ce qui a changé : quels passages ont été ajoutés, modifiés ou supprimés. C'est un frein pour le PO qui veut valider les suggestions avant de faire un Writeback vers Jira.

Le composant `ImprovedVersion` existe déjà dans `StoryDetailPage.tsx` mais ne fait qu'afficher le texte brut de la version améliorée.

### Solution

Ajouter une vue diff side-by-side (ou unified) qui surligne les ajouts (vert), suppressions (rouge) et modifications dans la comparaison entre la description originale et la version améliorée. Un toggle permet de passer de la vue "diff" à la vue "texte seul".

### Périmètre

**Inclus :**
- Composant `DiffViewer` : vue diff unified ou side-by-side (switch)
- Ajouts surlignés en vert, suppressions en rouge, contexte inchangé en gris
- Algorithme de diff au niveau mot (pas ligne — les US sont souvent un seul paragraphe)
- Intégration dans `StoryDetailPage.tsx` comme 3e mode (Original / Améliorée / Diff)
- Compteur de changements ("12 modifications")
- Pas de nouvelle dépendance — diff calculé côté client avec un algo simple

**Hors périmètre :**
- Diff sur les critères d'acceptance (P2 — seulement la description pour le moment)
- Merge sélectif (accepter/rejeter des changements individuels)
- Historique des diffs

---

## 2. User Stories

#### US-1.1 : Vue diff entre original et amélioré

**En tant que** Marc (PO), **je veux** voir les différences surlignées entre l'US originale et la version améliorée **afin de** comprendre exactement ce que l'IA a modifié avant de faire un Writeback.

**Critères d'acceptation :**
- [ ] Un 3e bouton "Diff" apparaît dans le toggle (Original / Améliorée / **Diff**)
- [ ] La vue diff surligne les mots ajoutés en vert et les mots supprimés en rouge
- [ ] Le texte inchangé s'affiche normalement (pas de surlignage)
- [ ] Un compteur "X modifications" s'affiche en haut de la vue diff
- [ ] La vue diff n'est disponible que si une version améliorée existe

#### US-1.2 : Mode side-by-side vs unified

**En tant que** Marc (PO), **je veux** choisir entre une vue "côte à côte" et une vue "unifiée" **afin d'** adapter l'affichage à mon écran (côte à côte sur grand écran, unifié sur petit).

**Critères d'acceptation :**
- [ ] Deux boutons icônes : ☐☐ (side-by-side) et ☐ (unified)
- [ ] Side-by-side : colonne gauche = original, colonne droite = amélioré, les parties différentes sont surlignées dans les deux colonnes
- [ ] Unified : un seul texte avec les suppressions (rouge barré) et ajouts (vert) inline
- [ ] Le mode par défaut est "unified" (plus lisible sur écrans standards)

---

## 3. Feature Détaillée

### F1 — Algorithme de diff par mots

**Pas de lib externe.** Implémenter un diff de mots simple :

1. Tokeniser les deux textes en mots (split par espaces et ponctuation)
2. Appliquer un algorithme LCS (Longest Common Subsequence) sur les tokens
3. Produire un array de `DiffToken` : `{ text: string, type: 'added' | 'removed' | 'unchanged' }`
4. Performance : LCS est O(n×m) — acceptable pour des textes de US (<2000 mots)

**Alternative acceptable :** Si le diff par mots est trop complexe pour un MVP, un diff par lignes (split par `\n`) est un fallback viable.

### F2 — Rendu visuel

**Unified :** Les tokens `removed` sont en `bg-red-100 text-red-800 line-through`, les tokens `added` sont en `bg-green-100 text-green-800`, les tokens `unchanged` sont en texte normal.

**Side-by-side :** Deux colonnes, l'originale à gauche avec les `removed` surlignés en rouge, l'améliorée à droite avec les `added` surlignés en vert.

---

## 4. Wireframes

### Vue diff unified

```
┌──────────────────────────────────────────────────────┐
│  [Original] [Améliorée] [🔀 Diff]      12 modifs    │
│                                          [☐☐] [☐]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  En tant qu'utilisateur ~~enregisté~~ enregistré,    │
│  je veux me connecter ~~a~~ à l'application via      │
│  mon adresse email et mon mot de passe, afin         │
│  d'accéder à mon espace personnel et aux             │
│  fonctionnalités qui me sont réservées.              │
│                                                      │
│  Critères d'acceptance :                             │
│  ~~-~~ - Email valide requis (format RFC 5322)       │
│  - Mot de passe minimum 8 caractères                 │
│  + - Message d'erreur explicite si identifiants      │
│  +   incorrects (max 5 tentatives)                   │
│  + - Redirection vers le dashboard après connexion   │
│                                                      │
└──────────────────────────────────────────────────────┘

Légende : ~~texte~~ = rouge barré (supprimé), + = vert (ajouté)
```

---

## 5. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Diff calculé en < 100ms pour un texte de 2000 mots |
| Pas de dépendance | Algorithme diff implémenté from scratch (pas de `diff-match-patch` ou similaire) |
| Accessibilité | Les couleurs ne sont pas le seul indicateur : ajouts ont un `+` préfixe, suppressions ont un `~~` barré |
| Responsive | Side-by-side masqué sous 768px, fallback unified |

---

> 📎 **Code existant :** `ImprovedVersion` composant dans `StoryDetailPage`, toggle Original/Améliorée, `analysis.improvedVersion` contient le texte amélioré.
