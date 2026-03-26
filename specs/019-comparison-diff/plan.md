# Plan Technique — Comparaison Avant/Après

> 2026-03-26

---

## Summary

Feature 100% frontend. Aucune API nouvelle, aucune migration. Le diff est calculé côté client entre `story.description` et `analysis.improvedVersion` — les deux sont déjà en mémoire dans `StoryDetailPage.tsx`. Le composant `DiffViewer` est un nouveau composant réutilisable avec deux modes de rendu (unified/side-by-side).

---

## Architecture

### Nouveaux composants

| Composant | Fichier | Responsabilité |
|---|---|---|
| `DiffViewer` | `components/diff/DiffViewer.tsx` | Rendu visuel du diff (unified + side-by-side) |
| `DiffViewerSideBySide` | `components/diff/DiffViewerSideBySide.tsx` | Mode côte à côte |
| `DiffViewerUnified` | `components/diff/DiffViewerUnified.tsx` | Mode unifié |
| `computeWordDiff` | `utils/diff.ts` | Algorithme LCS par mots |

### Composant modifié

| Fichier | Modification |
|---|---|
| `pages/StoryDetailPage.tsx` | Ajout du 3e mode "Diff" dans le toggle + rendu conditionnel `DiffViewer` |

### Algorithme de diff — LCS par mots

```typescript
// utils/diff.ts

interface DiffToken {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

function tokenize(text: string): string[] {
  // Split par espaces tout en gardant la ponctuation attachée
  return text.split(/(\s+)/).filter(Boolean);
}

function lcs(a: string[], b: string[]): number[][] {
  // Table LCS classique O(n×m)
  // Pour des US de < 2000 mots, c'est instantané
}

function computeWordDiff(original: string, improved: string): DiffToken[] {
  // 1. Tokenize les deux textes
  // 2. Calculer la table LCS
  // 3. Backtrack pour produire les DiffTokens
  // 4. Retourner le tableau de tokens typés
}
```

**Performance :** Une US fait typiquement 100-500 mots. LCS sur 500×500 = 250k opérations — < 5ms sur tout navigateur moderne.

---

## Stratégie de Test

### Tests unitaires `computeWordDiff` (5 tests — les plus importants)

| Test | Description |
|---|---|
| `identical texts should return all unchanged` | Pas de diff |
| `should detect added words` | "hello" → "hello world" → world = added |
| `should detect removed words` | "hello world" → "hello" → world = removed |
| `should detect mixed changes` | Ajouts + suppressions dans le même texte |
| `should handle empty strings` | "" vs "hello" → tout ajouté |

### Tests composants (6 tests)

| Test | Description |
|---|---|
| `DiffViewer should render unified mode by default` | Mode par défaut |
| `should switch to side-by-side mode` | Toggle |
| `should show change count` | "12 modifications" |
| `DiffViewerUnified should highlight added tokens in green` | Class CSS |
| `DiffViewerUnified should show removed tokens with strikethrough` | Class CSS |
| `DiffViewerSideBySide should render two columns` | Layout check |

---

## Fichiers : 7 à créer, 1 à modifier

### À créer
```
apps/frontend/src/
├── utils/
│   ├── diff.ts                         # Algorithme LCS + computeWordDiff
│   └── diff.test.ts                    # 5 tests unitaires
├── components/diff/
│   ├── DiffViewer.tsx                  # Wrapper avec toggle unified/side-by-side
│   ├── DiffViewer.test.tsx             # 3 tests
│   ├── DiffViewerUnified.tsx           # Rendu unifié
│   ├── DiffViewerUnified.test.tsx      # 2 tests
│   └── DiffViewerSideBySide.tsx        # Rendu côte à côte
```

### À modifier
```
apps/frontend/src/pages/StoryDetailPage.tsx  — toggle 3 modes + rendu DiffViewer
```

---

## Risques

| Risque | Mitigation |
|---|---|
| LCS naïf trop lent pour des textes très longs | Les US font < 2000 mots — O(n²) est OK. Si besoin, passer au diff par lignes |
| Le diff par mots produit trop de "bruit" sur de petits changements typographiques | Normaliser les espaces et la ponctuation avant le diff |
| Side-by-side illisible sur petit écran | Masquer le toggle sous 768px, forcer unified |
