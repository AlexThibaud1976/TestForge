# 🚀 Claude Code — Filtre UI par Projet/Connexion (P1)

> **Comment utiliser ce fichier :**
> Ouvre un terminal à la racine du monorepo TestForge et lance :
> ```bash
> claude < specs/p1-project-filter/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge est un SaaS B2B multi-tenant (React + Vite frontend, Node.js + Express backend, Supabase PostgreSQL). Les clients connectent plusieurs projets Jira et/ou Azure DevOps. La page User Stories (`/stories`) affiche toutes les stories de toutes les connexions. Il faut améliorer le filtrage par connexion source et ajouter un badge visuel par story.

**État actuel du code (`apps/frontend/src/pages/StoriesPage.tsx`) :**
- Un state `connectionFilter` existe déjà avec un `<select>` basique (affiché si `connections.length > 1`)
- Le state est passé à l'API via `?connectionId=connectionFilter`
- `UserStoryCard` est une fonction locale dans `StoriesPage.tsx` (pas un composant séparé)
- `StatusBadge` est aussi une fonction locale dans `StoriesPage.tsx`
- L'API `GET /api/user-stories?connectionId=xxx` fonctionne déjà (vérifié dans `apps/backend/src/routes/userStories.ts`)
- L'API `GET /api/connections` retourne `{ id, name, type }` pour chaque connexion

**Ce qui manque :**
1. Pas de sync du filtre connexion avec l'URL (pas partageable, perdu au refresh)
2. Pas de badge indiquant la connexion source sur chaque story card
3. Le dropdown n'a pas d'icônes Jira/ADO pour distinguer les types
4. Le badge n'est pas cliquable pour filtrer
5. Aucun test frontend (ni hook, ni composant)

---

## Règles de code (NON-NÉGOCIABLES)

1. **TypeScript strict** — aucun `any` implicite, aucun `@ts-ignore`
2. **Test-first** — chaque nouveau fichier commence par son fichier `.test.tsx` / `.test.ts`. Les tests sont écrits ET échouent (RED) AVANT l'implémentation. Cycle Red → Green → Refactor
3. **Pas de régression** — les filtres existants (search, status, pagination) doivent continuer à fonctionner identiquement
4. **Conventions du projet** — utiliser `api` de `../lib/api.js`, les imports se terminent par `.js`, le style est Tailwind CSS
5. **Pas de nouvelle dépendance npm** — tout est faisable avec React, react-router-dom (déjà présent), et Tailwind
6. **Documentation** — mettre à jour le User Guide après implémentation

---

## TÂCHE 1 — Tests d'intégration backend (non-régression API)

### Objectif
Figer le contrat API existant avec des tests d'intégration. Ces tests DOIVENT passer sur le code actuel sans aucune modification backend.

### Fichier à créer
- `apps/backend/src/routes/__tests__/userStories.connectionFilter.test.ts`

### Contenu attendu

4 tests d'intégration (Vitest) qui vérifient :

```typescript
// Test 1: GET /api/user-stories?connectionId=<valid-uuid>
// → retourne uniquement les stories dont connection_id = uuid
// → status 200, data.length > 0 (si stories existent), total correspond

// Test 2: GET /api/user-stories?connectionId=<uuid-inexistant>
// → retourne { data: [], total: 0 }, PAS une erreur 400 ou 500

// Test 3: GET /api/user-stories?connectionId=<uuid>&search=login
// → filtre combiné : seules les stories de cette connexion ET contenant "login"

// Test 4: GET /api/user-stories?connectionId=<uuid>&status=To%20Do
// → filtre combiné : seules les stories de cette connexion ET status "To Do"
```

**Setup** : utiliser le pattern existant des tests backend (voir `apps/backend/src/routes/__tests__/` s'il y en a, sinon créer le dossier). Mocker ou utiliser la DB de test Supabase selon le setup CI existant.

### Vérification
```bash
cd apps/backend && pnpm test -- --grep "connectionFilter"
```

---

## TÂCHE 2 — Hook `useConnectionFilter` (test-first)

### Objectif
Extraire la logique du filtre connexion dans un hook réutilisable qui sync l'état avec les URL search params (`?connectionId=xxx`).

### Fichiers à créer
- `apps/frontend/src/hooks/useConnectionFilter.test.ts` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/hooks/useConnectionFilter.ts`

### Tests à écrire (RED d'abord)

```typescript
import { describe, it, expect, vi } from 'vitest';
// Utiliser @testing-library/react pour renderHook si disponible,
// sinon tester la logique pure

describe('useConnectionFilter', () => {
  it('should return all active connections loaded from API', async () => {
    // Mock api.get('/api/connections') → [{ id: '1', name: 'Backend', type: 'jira' }, ...]
    // Vérifier que connections === la liste mockée
  });

  it('should default to null connectionId when no URL param', () => {
    // Pas de ?connectionId dans l'URL
    // connectionId doit être null
  });

  it('should read connectionId from URL search params on mount', () => {
    // Simuler URL avec ?connectionId=abc-123
    // connectionId doit être 'abc-123'
  });

  it('should update URL search params when setConnectionId is called', () => {
    // Appeler setConnectionId('abc-123')
    // Vérifier que l'URL contient ?connectionId=abc-123
  });

  it('should remove URL param when connectionId set to null', () => {
    // Depuis un état filtré, appeler setConnectionId(null)
    // Vérifier que ?connectionId n'est plus dans l'URL
  });

  it('should preserve other URL params when changing connectionId', () => {
    // URL: ?search=login&status=To+Do
    // Appeler setConnectionId('xxx')
    // Vérifier: ?search=login&status=To+Do&connectionId=xxx
  });

  it('should fallback to null if URL connectionId is not in connections list', () => {
    // URL: ?connectionId=uuid-qui-nexiste-pas
    // connections chargées ne contiennent pas cet UUID
    // connectionId doit revenir à null
  });
});
```

### Implémentation (après RED)

```typescript
// apps/frontend/src/hooks/useConnectionFilter.ts
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Connection {
  id: string;
  name: string;
  type: 'jira' | 'azure_devops';
  isActive: boolean;
}

interface UseConnectionFilterReturn {
  connections: Connection[];
  connectionId: string | null;
  setConnectionId: (id: string | null) => void;
  loading: boolean;
}

export function useConnectionFilter(): UseConnectionFilterReturn {
  // useSearchParams pour sync bidirectionnelle URL ↔ state
  // Charger les connexions via api.get<Connection[]>('/api/connections')
  // Filtrer isActive === true
  // Valider que le connectionId de l'URL existe dans la liste
  // Fallback à null si invalide
}
```

**Important :** ce hook REMPLACE le `connectionFilter` state et le `useEffect` de chargement des connexions dans `StoriesPage.tsx`. Il ne s'ajoute pas en doublon.

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "useConnectionFilter"
```

---

## TÂCHE 3 — Composant `ConnectionBadge` (test-first)

### Objectif
Badge compact affiché sur chaque story card montrant la connexion source (icône type + nom tronqué). Cliquable pour filtrer.

### Fichiers à créer
- `apps/frontend/src/components/ConnectionBadge.test.tsx` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/components/ConnectionBadge.tsx`

### Tests à écrire (RED d'abord)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionBadge } from './ConnectionBadge.js';

describe('ConnectionBadge', () => {
  it('should render the connection name', () => {
    render(<ConnectionBadge name="Backend API" type="jira" connectionId="123" />);
    expect(screen.getByText('Backend API')).toBeDefined();
  });

  it('should truncate name longer than 20 characters', () => {
    render(<ConnectionBadge name="Very Long Project Name That Exceeds" type="jira" connectionId="123" />);
    expect(screen.getByText('Very Long Project Nam…')).toBeDefined();
  });

  it('should display a Jira-style indicator for type jira', () => {
    const { container } = render(<ConnectionBadge name="X" type="jira" connectionId="123" />);
    // Vérifier la présence d'un indicateur bleu (class text-blue-600 ou svg Jira)
  });

  it('should display an ADO-style indicator for type azure_devops', () => {
    const { container } = render(<ConnectionBadge name="X" type="azure_devops" connectionId="123" />);
    // Vérifier la présence d'un indicateur violet (class text-purple-600 ou svg ADO)
  });

  it('should call onClick with connectionId when clicked', () => {
    const onClick = vi.fn();
    render(<ConnectionBadge name="X" type="jira" connectionId="abc" onClick={onClick} />);
    fireEvent.click(screen.getByText('X'));
    expect(onClick).toHaveBeenCalledWith('abc');
  });

  it('should render fallback for missing connection', () => {
    render(<ConnectionBadge name={null} type={null} connectionId={null} />);
    expect(screen.getByText('Projet supprimé')).toBeDefined();
  });
});
```

### Implémentation (après RED)

```typescript
// apps/frontend/src/components/ConnectionBadge.tsx

interface ConnectionBadgeProps {
  name: string | null;
  type: 'jira' | 'azure_devops' | null;
  connectionId: string | null;
  onClick?: (connectionId: string) => void;
}

export function ConnectionBadge({ name, type, connectionId, onClick }: ConnectionBadgeProps) {
  // Tronquer le nom à 20 chars + '…'
  // Icône : 🔵 petit cercle bleu pour Jira, 🟣 violet pour ADO
  // Implémenter comme un <button> si onClick fourni, sinon <span>
  // Style : text-xs, bg-gray-50, rounded, px-2 py-0.5, hover si cliquable
  // Fallback : "Projet supprimé" en text-gray-400 italic si name est null
}
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "ConnectionBadge"
```

---

## TÂCHE 4 — Amélioration du dropdown connexion (dans StoriesPage)

### Objectif
Remplacer le `<select>` basique par un dropdown amélioré avec icônes Jira/ADO. Peut rester un `<select>` natif (plus accessible) mais avec un meilleur label.

### Fichier à modifier
- `apps/frontend/src/pages/StoriesPage.tsx`

### Modifications

**Avant (code actuel) :**
```tsx
{connections.length > 1 && (
  <select
    value={connectionFilter}
    onChange={(e) => { setConnectionFilter(e.target.value); setPage(1); }}
    className="px-3 py-2 text-sm border border-gray-300 rounded-md ..."
  >
    <option value="">Toutes connexions</option>
    {connections.map((c) => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
)}
```

**Après :**
```tsx
// 1. Remplacer les states locaux par le hook :
// SUPPRIMER : const [connectionFilter, setConnectionFilter] = useState('');
// SUPPRIMER : const [connections, setConnections] = useState<Connection[]>([]);
// SUPPRIMER : le useEffect qui charge les connexions

// AJOUTER :
const {
  connections,
  connectionId,
  setConnectionId,
  loading: connectionsLoading,
} = useConnectionFilter();

// 2. Adapter le fetchStories pour utiliser connectionId du hook :
// Remplacer connectionFilter par connectionId dans les URLSearchParams

// 3. Le select utilise connectionId et setConnectionId :
{connections.length > 1 && (
  <select
    value={connectionId ?? ''}
    onChange={(e) => { setConnectionId(e.target.value || null); setPage(1); }}
    className="px-3 py-2 text-sm border border-gray-300 rounded-md ..."
  >
    <option value="">Tous les projets</option>
    {connections.map((c) => (
      <option key={c.id} value={c.id}>
        {c.type === 'jira' ? '🔵' : '🟣'} {c.name}
      </option>
    ))}
  </select>
)}

// 4. Condition d'affichage : afficher même avec 1 connexion (pour cohérence)
// Changer connections.length > 1 → connections.length > 0
```

### Vérification
```bash
cd apps/frontend && pnpm typecheck
cd apps/frontend && pnpm test
# + test manuel : le dropdown fonctionne, l'URL se met à jour
```

---

## TÂCHE 5 — Ajouter ConnectionBadge dans UserStoryCard

### Objectif
Chaque story card affiche un badge indiquant sa connexion source. Clic sur le badge filtre par cette connexion.

### Fichier à modifier
- `apps/frontend/src/pages/StoriesPage.tsx` — la fonction locale `UserStoryCard`

### Modifications

**Ajouter l'import :**
```tsx
import { ConnectionBadge } from '../components/ConnectionBadge.js';
```

**Modifier la signature de UserStoryCard :**
```tsx
// AVANT :
function UserStoryCard({ story, onClick }: { story: UserStory; onClick: () => void }) {

// APRÈS :
function UserStoryCard({ story, connection, onClick, onConnectionClick }: {
  story: UserStory;
  connection: Connection | undefined;
  onClick: () => void;
  onConnectionClick?: (connectionId: string) => void;
}) {
```

**Ajouter le badge dans le JSX de UserStoryCard :**
Placer le `<ConnectionBadge>` en bas à droite de la carte, après les labels :

```tsx
<div className="flex items-center justify-between mt-2">
  <div className="flex gap-1 flex-wrap">
    {story.labels.slice(0, 4).map((label) => (
      <span key={label} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
        {label}
      </span>
    ))}
  </div>
  <ConnectionBadge
    name={connection?.name ?? null}
    type={(connection?.type as 'jira' | 'azure_devops') ?? null}
    connectionId={story.connectionId ?? null}
    onClick={onConnectionClick ? (id) => {
      // Empêcher la propagation pour ne pas naviguer vers le détail
      onConnectionClick(id);
    } : undefined}
  />
</div>
```

**Modifier l'appel dans StoriesPage :**
```tsx
{stories.map((story) => (
  <UserStoryCard
    key={story.id}
    story={story}
    connection={connections.find((c) => c.id === story.connectionId)}
    onClick={() => void navigate(`/stories/${story.id}`)}
    onConnectionClick={(id) => { setConnectionId(id); setPage(1); }}
  />
))}
```

**⚠️ Attention à la propagation des événements :** Le badge est un `<button>` à l'intérieur d'un `<button>` (la carte). Il faut `e.stopPropagation()` dans le onClick du badge pour éviter de naviguer vers le détail.

### Vérification
```bash
cd apps/frontend && pnpm typecheck
cd apps/frontend && pnpm test
# + test manuel : badge visible, clic filtre, clic carte navigue
```

---

## TÂCHE 6 — Bouton "Analyser tout le sprint" respecte le filtre

### Objectif
Si un filtre connexion est actif, le bouton d'analyse batch ne traite que les stories filtrées. Afficher un compteur avant lancement.

### Fichier à modifier
- `apps/frontend/src/pages/StoriesPage.tsx` (ou le composant contenant le bouton "Analyser tout le sprint")

### Modifications

Localiser le bouton "Analyser tout le sprint" visible sur le screenshot (en haut à droite, fond bleu). Vérifier :
1. Qu'il utilise le même `connectionId` filter que la liste
2. Qu'il affiche "(X stories)" dans le label quand un filtre est actif
3. Si le bouton est dans un composant séparé, lui passer le connectionId en prop

**Note :** Si le bouton envoie une requête batch à l'API, vérifier que l'API prend en compte le `connectionId` dans la requête batch. Si non, ajouter le support.

### Vérification
```bash
# Test manuel : filtrer par connexion, vérifier que "Analyser tout le sprint" montre le bon nombre
```

---

## TÂCHE 7 — Documentation

### Objectif
Mettre à jour le guide utilisateur avec la description du filtre projet.

### Fichier à modifier
- `docs/user-guide.md` (ou l'équivalent existant)

### Contenu à ajouter

Section "Filtrer par projet/connexion" dans la partie User Stories :
- Description du dropdown "Tous les projets"
- Explication des icônes 🔵 Jira / 🟣 ADO
- Mention que le filtre est partageable via l'URL
- Mention du clic sur badge pour filtrer

### Vérification
```bash
# Relire le user guide pour cohérence
```

---

## TÂCHE 8 — Vérification finale

### Objectif
S'assurer que tout est propre avant merge.

### Checklist

```bash
# 1. TypeScript strict — aucune erreur
pnpm typecheck

# 2. Lint — aucun warning
pnpm lint

# 3. Tests — tous passent (existants + nouveaux)
pnpm test

# 4. Pas de any, pas de @ts-ignore
grep -r "any" apps/frontend/src/hooks/useConnectionFilter.ts apps/frontend/src/components/ConnectionBadge.tsx
grep -r "ts-ignore" apps/frontend/src/

# 5. Pas de console.log oublié
grep -r "console.log" apps/frontend/src/hooks/useConnectionFilter.ts apps/frontend/src/components/ConnectionBadge.tsx

# 6. Build propre
pnpm build
```

---

## Récapitulatif des fichiers

### À créer (6 fichiers)
```
apps/backend/src/routes/__tests__/userStories.connectionFilter.test.ts
apps/frontend/src/hooks/useConnectionFilter.test.ts
apps/frontend/src/hooks/useConnectionFilter.ts
apps/frontend/src/components/ConnectionBadge.test.tsx
apps/frontend/src/components/ConnectionBadge.tsx
```

### À modifier (2 fichiers)
```
apps/frontend/src/pages/StoriesPage.tsx    — hook + badge + dropdown amélioré
docs/user-guide.md                         — section filtre projet
```

### À NE PAS toucher (0 fichiers backend)
Aucune modification backend. L'API supporte déjà tout ce qu'il faut.

---

> 📝 Specs complètes : `specs/p1-project-filter/spec.md`, `plan.md`, `tasks.md`
> 🏗️ Architecture : `TestForge_Architecture.docx` dans le project knowledge
