# 🚀 Claude Code — Comparaison Avant/Après Analyse

> ```bash
> claude < specs/007-comparison-diff/CLAUDE_TASK.md
> ```

---

## Contexte

Après une analyse, TestForge produit une version améliorée de l'US. Actuellement `StoryDetailPage.tsx` a un toggle "Original / Améliorée" qui affiche l'un ou l'autre. Il faut ajouter un 3e mode "Diff" avec surlignage des changements. Feature 100% frontend, aucune API nouvelle.

**Code existant clé :**

`apps/frontend/src/pages/StoryDetailPage.tsx` :
- State `activeVersion: 'original' | 'improved'` — à étendre avec `'diff'`
- `story.description` = texte original
- `analysis.improvedVersion` = texte amélioré (nullable)
- Toggle existant avec 2 boutons dans un `bg-gray-100 rounded-lg p-1`
- Composant `ImprovedVersion` existant dans `components/analysis/ImprovedVersion.tsx`

---

## Règles : TypeScript strict, test-first, PAS de lib de diff externe, imports `.js`

---

## TÂCHE 1 — Algorithme `computeWordDiff` (test-first — LE PLUS IMPORTANT)

### Fichiers
- `apps/frontend/src/utils/diff.test.ts` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/utils/diff.ts`

### Tests à écrire

```typescript
import { describe, it, expect } from 'vitest';
import { computeWordDiff, type DiffToken } from './diff.js';

describe('computeWordDiff', () => {
  it('should return all unchanged for identical texts', () => {
    const result = computeWordDiff('hello world', 'hello world');
    expect(result.every(t => t.type === 'unchanged')).toBe(true);
  });

  it('should detect added words', () => {
    const result = computeWordDiff('hello', 'hello world');
    expect(result).toContainEqual({ text: 'world', type: 'added' });
  });

  it('should detect removed words', () => {
    const result = computeWordDiff('hello world', 'hello');
    expect(result).toContainEqual({ text: 'world', type: 'removed' });
  });

  it('should handle mixed changes', () => {
    const result = computeWordDiff(
      'En tant que utilisateur enregisté',
      'En tant que utilisateur enregistré connecté'
    );
    const types = result.map(t => t.type);
    expect(types).toContain('removed');  // "enregisté"
    expect(types).toContain('added');    // "enregistré", "connecté"
  });

  it('should handle empty original', () => {
    const result = computeWordDiff('', 'hello world');
    expect(result.every(t => t.type === 'added')).toBe(true);
  });

  it('should handle empty improved', () => {
    const result = computeWordDiff('hello world', '');
    expect(result.every(t => t.type === 'removed')).toBe(true);
  });

  it('should handle multiline texts', () => {
    const result = computeWordDiff(
      'Line one.\nLine two.',
      'Line one.\nLine two modified.\nLine three added.'
    );
    expect(result.some(t => t.type === 'added')).toBe(true);
  });
});
```

### Implémentation

```typescript
// apps/frontend/src/utils/diff.ts

export interface DiffToken {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

function tokenize(text: string): string[] {
  // Split by whitespace, keeping tokens clean
  // "hello world" → ["hello", "world"]
  // Preserve newlines as separate tokens for line-aware rendering
  return text.split(/(\s+)/).filter(t => t.length > 0);
}

export function computeWordDiff(original: string, improved: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(improved);

  // Build LCS table
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to produce diff tokens
  const result: DiffToken[] = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ text: a[i - 1], type: 'unchanged' });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ text: b[j - 1], type: 'added' });
      j--;
    } else {
      result.unshift({ text: a[i - 1], type: 'removed' });
      i--;
    }
  }

  return result;
}
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "computeWordDiff"
```

---

## TÂCHE 2 — Composants de rendu (test-first)

### `DiffViewerUnified.tsx`

```tsx
interface DiffViewerUnifiedProps {
  tokens: DiffToken[];
}

export function DiffViewerUnified({ tokens }: DiffViewerUnifiedProps) {
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {tokens.map((token, i) => {
        if (token.type === 'added') {
          return <span key={i} className="bg-green-100 text-green-800">{token.text}</span>;
        }
        if (token.type === 'removed') {
          return <span key={i} className="bg-red-100 text-red-800 line-through">{token.text}</span>;
        }
        return <span key={i}>{token.text}</span>;
      })}
    </div>
  );
}
```

### `DiffViewerSideBySide.tsx`

```tsx
// Deux colonnes : gauche = original (removed en rouge), droite = amélioré (added en vert)
// Filtrer les tokens :
//   Gauche : tokens.filter(t => t.type !== 'added')  → "removed" surlignés, "unchanged" normal
//   Droite : tokens.filter(t => t.type !== 'removed') → "added" surlignés, "unchanged" normal
```

### `DiffViewer.tsx` (wrapper)

```tsx
interface DiffViewerProps {
  original: string;
  improved: string;
}

export function DiffViewer({ original, improved }: DiffViewerProps) {
  const [mode, setMode] = useState<'unified' | 'side-by-side'>('unified');
  const tokens = useMemo(() => computeWordDiff(original, improved), [original, improved]);
  const changeCount = tokens.filter(t => t.type !== 'unchanged').length;

  return (
    <div>
      {/* Header : compteur + toggle mode */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{changeCount} modification{changeCount > 1 ? 's' : ''}</span>
        <div className="flex gap-1">
          {/* Boutons toggle unified / side-by-side */}
          {/* Masquer side-by-side sous 768px avec hidden md:flex */}
        </div>
      </div>

      {/* Rendu conditionnel */}
      {mode === 'unified'
        ? <DiffViewerUnified tokens={tokens} />
        : <DiffViewerSideBySide tokens={tokens} />
      }
    </div>
  );
}
```

---

## TÂCHE 3 — Intégration dans StoryDetailPage

### Modifier `apps/frontend/src/pages/StoryDetailPage.tsx`

**1. Étendre le type de version :**
```typescript
// AVANT :
const [activeVersion, setActiveVersion] = useState<'original' | 'improved'>('original');
// APRÈS :
const [activeVersion, setActiveVersion] = useState<'original' | 'improved' | 'diff'>('original');
```

**2. Ajouter le 3e bouton dans le toggle :**

Localiser le toggle existant (deux boutons dans un `bg-gray-100 rounded-lg p-1`). Ajouter un 3e bouton :

```tsx
{analysis?.improvedVersion && (
  <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
    <button onClick={() => setActiveVersion('original')} className={...}>
      US originale
    </button>
    <button onClick={() => setActiveVersion('improved')} className={...}>
      ✨ Version améliorée
    </button>
    <button onClick={() => setActiveVersion('diff')} className={...}>
      🔀 Diff
    </button>
  </div>
)}
```

**3. Rendu conditionnel :**
```tsx
// Dans la Card "Description" :
{activeVersion === 'diff' && analysis?.improvedVersion ? (
  <DiffViewer original={story.description ?? ''} improved={analysis.improvedVersion} />
) : (
  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
    {displayText || <span className="italic text-gray-400">Aucune description</span>}
  </p>
)}
```

**⚠️ Attention :** Le toggle existe à DEUX endroits dans `StoryDetailPage` — dans le header de l'onglet Analyse et dans la section Génération. Mettre à jour les deux.

---

## TÂCHE 4 — Vérification finale

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Test manuel : analyser une US → cliquer "Diff" → voir les surlignages → basculer side-by-side
```

---

## Fichiers : 7 à créer, 1 à modifier

### À créer
```
apps/frontend/src/utils/diff.ts
apps/frontend/src/utils/diff.test.ts
apps/frontend/src/components/diff/DiffViewer.tsx
apps/frontend/src/components/diff/DiffViewer.test.tsx
apps/frontend/src/components/diff/DiffViewerUnified.tsx
apps/frontend/src/components/diff/DiffViewerUnified.test.tsx
apps/frontend/src/components/diff/DiffViewerSideBySide.tsx
```

### À modifier
```
apps/frontend/src/pages/StoryDetailPage.tsx  — 3e mode diff dans le toggle + rendu DiffViewer
```

---

> 📝 Specs : `specs/007-comparison-diff/`
