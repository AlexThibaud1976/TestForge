# 🚀 Claude Code — Historique Arborescent avec Filtres

> **Comment utiliser ce fichier :**
> ```bash
> claude < specs/003-history-tree/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge est un SaaS B2B multi-tenant (React + Vite frontend, Node.js + Express backend, Supabase PostgreSQL). La page Historique (`/history`) affiche une liste plate de générations de tests. Il faut la transformer en vue arborescente : **Connexion (projet) → User Story → Générations**, avec un filtre par connexion.

**État actuel du code :**

`apps/frontend/src/pages/HistoryPage.tsx` :
- Affiche une liste plate de `Generation[]` depuis `GET /api/generations`
- `UserStoryCard` n'existe pas ici — chaque génération est un `<div>` inline
- **BUG #1 :** La ligne affiche `Playwright · TypeScript` en dur au lieu d'utiliser `gen.framework` + `gen.language`
- **BUG #2 :** Le bouton "Voir US" navigue vers `/stories` (liste) au lieu de `/stories/{userStoryId}`
- `handleDownload` fonctionne correctement (garder tel quel)

`apps/backend/src/routes/generations.ts` :
- `GET /api/generations` retourne des générations plates (pas de join US/connexion)
- `GET /api/generations/:id` retourne une génération avec ses fichiers
- La route `/:id` est déclarée après `/` — il faut insérer `/history` AVANT `/:id`
- Les relations Drizzle existent déjà : `generations → analyses → userStories → sourceConnections`

**Dépendance P1 :** Le hook `useConnectionFilter` et le composant dropdown doivent être disponibles (feature 002-p1-project-filter). S'ils ne sont pas encore mergés, créer un hook local temporaire.

---

## Règles de code (NON-NÉGOCIABLES)

1. **TypeScript strict** — aucun `any` implicite, aucun `@ts-ignore`
2. **Test-first** — chaque nouveau fichier commence par son `.test.tsx` / `.test.ts`. Tests RED avant implémentation GREEN
3. **Pas de régression** — l'endpoint `GET /api/generations` existant reste inchangé
4. **Route ordering Express** — `/history` DOIT être déclaré AVANT `/:id` sinon "history" est interprété comme un UUID
5. **Conventions du projet** — imports `.js`, Tailwind CSS, `api` de `../lib/api.js`
6. **Pas de nouvelle dépendance npm**

---

## TÂCHE 1 — Endpoint backend `GET /api/generations/history`

### Objectif
Nouvel endpoint qui retourne les générations avec LEFT JOIN sur analyses → userStories → sourceConnections.

### Fichiers à créer/modifier
- `apps/backend/src/routes/__tests__/generations.history.test.ts` (ÉCRIRE EN PREMIER)
- `apps/backend/src/routes/generations.ts` (ajout de la route)

### Tests à écrire (RED d'abord)

```typescript
describe('GET /api/generations/history', () => {
  it('should return enriched generations with US title and connection data', async () => {
    // Vérifie que chaque item a: userStoryTitle, userStoryExternalId, connectionName, connectionType
  });

  it('should return null fields for orphan generations (no linked US)', async () => {
    // Génération dont l'analyse n'a pas de userStoryId → champs US/connexion null
  });

  it('should filter by connectionId query param', async () => {
    // ?connectionId=xxx → seules les générations de cette connexion
  });

  it('should only return generations for the authenticated team', async () => {
    // Team A ne voit pas les générations de Team B
  });

  it('should return max 50 results ordered by createdAt desc', async () => {
    // Vérifier l'ordre et la limite
  });

  it('should return empty array when no generations exist', async () => {
    // Nouveau compte → []
  });

  it('should not conflict with GET /api/generations/:id', async () => {
    // Les deux routes coexistent : /history retourne un array, /:id retourne un objet
  });
});
```

### Implémentation (après RED)

Ajouter cette route dans `apps/backend/src/routes/generations.ts` — **AVANT la route `router.get('/:id', ...)`** :

```typescript
// GET /api/generations/history — vue arborescente enrichie
router.get('/history', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const connectionId = req.query['connectionId'] as string | undefined;

  const conditions = [eq(generations.teamId, teamId)];
  if (connectionId) {
    // Filtrer via le join : userStories.connectionId
    conditions.push(eq(userStories.connectionId, connectionId));
  }

  const rows = await db
    .select({
      id: generations.id,
      analysisId: generations.analysisId,
      framework: generations.framework,
      language: generations.language,
      usedImprovedVersion: generations.usedImprovedVersion,
      llmProvider: generations.llmProvider,
      llmModel: generations.llmModel,
      status: generations.status,
      durationMs: generations.durationMs,
      createdAt: generations.createdAt,
      // JOIN enrichi
      userStoryId: userStories.id,
      userStoryTitle: userStories.title,
      userStoryExternalId: userStories.externalId,
      connectionId: sourceConnections.id,
      connectionName: sourceConnections.name,
      connectionType: sourceConnections.type,
    })
    .from(generations)
    .leftJoin(analyses, eq(generations.analysisId, analyses.id))
    .leftJoin(userStories, eq(analyses.userStoryId, userStories.id))
    .leftJoin(sourceConnections, eq(userStories.connectionId, sourceConnections.id))
    .where(and(...conditions))
    .orderBy(desc(generations.createdAt))
    .limit(50);

  res.json(rows);
});
```

**⚠️ CRITIQUE :** Cette route DOIT apparaître dans le fichier AVANT `router.get('/:id', ...)`. Express matche les routes dans l'ordre de déclaration. Si `/:id` est en premier, "history" sera interprété comme un UUID et provoquera une erreur 404 ou un comportement imprévisible.

### Vérification
```bash
cd apps/backend && pnpm test -- --grep "generations/history"
# Puis vérifier que les anciens tests passent toujours :
cd apps/backend && pnpm test
```

---

## TÂCHE 2 — Hook `useHistoryData` (test-first)

### Objectif
Fetch les données depuis le nouvel endpoint et les structurer en arbre pour le rendu.

### Fichiers à créer
- `apps/frontend/src/hooks/useHistoryData.test.ts` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/hooks/useHistoryData.ts`

### Types à définir

```typescript
// Dans useHistoryData.ts ou un fichier types dédié

interface GenerationHistoryItem {
  id: string;
  analysisId: string | null;
  framework: string;
  language: string;
  usedImprovedVersion: boolean;
  llmProvider: string;
  llmModel: string;
  status: string;
  durationMs: number | null;
  createdAt: string;
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
}

interface StoryGroup {
  userStoryId: string | null;
  userStoryTitle: string | null;
  userStoryExternalId: string | null;
  generations: GenerationHistoryItem[];
}

interface ConnectionGroup {
  connectionId: string | null;
  connectionName: string | null;
  connectionType: 'jira' | 'azure_devops' | null;
  stories: StoryGroup[];
  totalGenerations: number;
}
```

### Algorithme de groupement

```typescript
// Pseudo-code de la structuration
function groupByTree(items: GenerationHistoryItem[]): ConnectionGroup[] {
  // 1. Grouper par connectionId (null → "Non liées")
  // 2. Dans chaque groupe connexion, grouper par userStoryId (null → "Sans US")
  // 3. Trier connexions par nom alphabétique, "Non liées" en dernier
  // 4. Trier US par date de dernière génération (desc)
  // 5. Générations déjà triées par date desc (API)
  // 6. Calculer totalGenerations par connexion
}
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "useHistoryData"
```

---

## TÂCHE 3 — Composant `GenerationCard` (test-first — corrige les 2 bugs)

### Objectif
Carte de génération (feuille de l'arbre). Corrige le framework hardcodé et le lien "Voir US" cassé.

### Fichiers à créer
- `apps/frontend/src/components/history/GenerationCard.test.tsx` (ÉCRIRE EN PREMIER)
- `apps/frontend/src/components/history/GenerationCard.tsx`

### Props interface

```typescript
interface GenerationCardProps {
  generation: GenerationHistoryItem;
  onDownload: (id: string) => void;
}
```

### Implémentation clé

```tsx
// FIX BUG #1 : framework + language dynamiques
const frameworkLabel = gen.framework.charAt(0).toUpperCase() + gen.framework.slice(1);
const languageLabel = gen.language.charAt(0).toUpperCase() + gen.language.slice(1);
// Afficher : `${frameworkLabel} · ${languageLabel}`
// JAMAIS de string "Playwright · TypeScript" en dur

// FIX BUG #2 : navigation vers la bonne US
const navigate = useNavigate();
// Bouton "Voir US" :
<button
  onClick={() => gen.userStoryId && navigate(`/stories/${gen.userStoryId}`)}
  disabled={!gen.userStoryId}
  className={gen.userStoryId ? '...' : 'opacity-40 cursor-not-allowed ...'}
  title={gen.userStoryId ? undefined : 'US non disponible'}
>
  Voir US
</button>
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "GenerationCard"
```

---

## TÂCHE 4 — Composants `StoryGroup` et `ConnectionGroup` (test-first)

### Objectif
Niveaux 2 et 1 de l'arbre, chacun collapsible avec animation.

### Fichiers à créer
- `apps/frontend/src/components/history/StoryGroup.test.tsx` + `StoryGroup.tsx`
- `apps/frontend/src/components/history/ConnectionGroup.test.tsx` + `ConnectionGroup.tsx`

### Pattern collapsible commun

```tsx
// Pattern réutilisable pour les deux niveaux
function CollapsibleSection({ defaultOpen, header, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center ...">
        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>►</span>
        {header}
      </button>
      <div className={`overflow-hidden transition-all duration-150 ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
        {children}
      </div>
    </div>
  );
}
```

### ConnectionGroup header

```tsx
// Icône type + nom + compteur
<span>{type === 'jira' ? '🔵' : type === 'azure_devops' ? '🟣' : '⚪'}</span>
<span className="font-medium">{name ?? 'Non liées'}</span>
<span className="text-gray-400 text-xs ml-auto">{totalGenerations} génération{s}</span>
```

### StoryGroup header

```tsx
// ExternalId + titre + compteur
<span className="font-mono text-gray-400">{externalId ?? '—'}</span>
<span className="truncate">{title ?? 'Sans titre'}</span>
<span className="text-gray-400 text-xs ml-auto">{count} génération{s}</span>
```

### Vérification
```bash
cd apps/frontend && pnpm test -- --grep "StoryGroup|ConnectionGroup"
```

---

## TÂCHE 5 — Composant `HistoryTree` + assemblage

### Objectif
Composant d'assemblage qui itère sur les `ConnectionGroup[]` et rend l'arbre complet.

### Fichier à créer
- `apps/frontend/src/components/history/HistoryTree.tsx`

### Implémentation

```tsx
interface HistoryTreeProps {
  groups: ConnectionGroup[];
  onDownload: (generationId: string) => void;
}

export function HistoryTree({ groups, onDownload }: HistoryTreeProps) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {groups.map((connGroup, i) => (
        <ConnectionGroup
          key={connGroup.connectionId ?? 'orphan'}
          group={connGroup}
          defaultOpen={i === 0} // Premier groupe ouvert par défaut
        >
          {connGroup.stories.map((storyGroup) => (
            <StoryGroup
              key={storyGroup.userStoryId ?? 'no-us'}
              group={storyGroup}
              defaultOpen={false}
            >
              {storyGroup.generations.map((gen) => (
                <GenerationCard
                  key={gen.id}
                  generation={gen}
                  onDownload={onDownload}
                />
              ))}
            </StoryGroup>
          ))}
        </ConnectionGroup>
      ))}
    </div>
  );
}
```

---

## TÂCHE 6 — Réécriture de HistoryPage.tsx

### Objectif
Remplacer la page actuelle par la nouvelle version avec arbre + filtre.

### Fichier à modifier
- `apps/frontend/src/pages/HistoryPage.tsx`

### Nouvelle structure

```tsx
import { useConnectionFilter } from '../hooks/useConnectionFilter.js';
import { useHistoryData } from '../hooks/useHistoryData.js';
import { HistoryTree } from '../components/history/HistoryTree.js';

export function HistoryPage() {
  const { connections, connectionId, setConnectionId } = useConnectionFilter();
  const { groups, totalGenerations, loading } = useHistoryData(connectionId);

  const handleDownload = async (id: string) => {
    // CONSERVER la logique existante de téléchargement (supabase token + fetch blob)
    // Copier/coller depuis l'ancien HistoryPage.tsx
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header + filtre */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historique</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalGenerations} génération{totalGenerations !== 1 ? 's' : ''}
          </p>
        </div>
        {connections.length > 0 && (
          <select
            value={connectionId ?? ''}
            onChange={(e) => setConnectionId(e.target.value || null)}
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
      </div>

      {/* Arbre ou état vide */}
      {loading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : totalGenerations === 0 ? (
        // CONSERVER le message vide actuel (emoji 🕐 + lien vers stories)
      ) : (
        <HistoryTree groups={groups} onDownload={handleDownload} />
      )}
    </div>
  );
}
```

### Vérification
```bash
cd apps/frontend && pnpm typecheck
cd apps/frontend && pnpm test
# + test manuel : arbre, collapse, filtre, ZIP, "Voir US" → bonne page
```

---

## TÂCHE 7 — Documentation + vérification finale

### Fichier à modifier
- `docs/user-guide.md` — section "Historique" avec description de la vue arborescente

### Checklist finale

```bash
pnpm typecheck        # 0 erreur
pnpm lint             # 0 warning
pnpm test             # Tous passent (anciens + nouveaux)
grep -r "Playwright · TypeScript" apps/frontend/src/pages/HistoryPage.tsx  # DOIT retourner 0 lignes
grep -r "any" apps/frontend/src/components/history/ apps/frontend/src/hooks/useHistoryData.ts  # 0
grep -r "console.log" apps/frontend/src/components/history/  # 0
pnpm build            # Build propre
```

---

## Récapitulatif des fichiers

### À créer (12 fichiers)

```
apps/backend/src/routes/__tests__/generations.history.test.ts

apps/frontend/src/hooks/useHistoryData.test.ts
apps/frontend/src/hooks/useHistoryData.ts

apps/frontend/src/components/history/GenerationCard.test.tsx
apps/frontend/src/components/history/GenerationCard.tsx
apps/frontend/src/components/history/StoryGroup.test.tsx
apps/frontend/src/components/history/StoryGroup.tsx
apps/frontend/src/components/history/ConnectionGroup.test.tsx
apps/frontend/src/components/history/ConnectionGroup.tsx
apps/frontend/src/components/history/HistoryTree.tsx
```

### À modifier (2 fichiers)

```
apps/backend/src/routes/generations.ts        — ajout route /history AVANT /:id
apps/frontend/src/pages/HistoryPage.tsx       — réécriture complète
```

### À NE PAS toucher

```
apps/backend/src/routes/generations.ts        — routes existantes (GET /, GET /:id, GET /:id/download)
apps/frontend/src/pages/StoryDetailPage.tsx   — consomme GET /api/generations?analysisId=, inchangé
```

---

> 📝 Specs complètes : `specs/003-history-tree/spec.md`, `plan.md`, `tasks.md`
> ⚠️ Prérequis : feature 002-p1-project-filter (hook `useConnectionFilter`) doit être mergée
