# 🚀 Claude Code — Analyse Batch Sprint

> ```bash
> claude < specs/005-batch-analysis/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge a un bouton "Analyser tout le sprint" sur la page Stories. Actuellement, l'API `POST /api/analyses` ne traite qu'une US à la fois. Il faut un endpoint batch + un modal de progression temps réel + un résumé des scores.

**Code existant clé :**
- `apps/backend/src/routes/analyses.ts` : route `POST /` accepte `{ userStoryId }` unique
- `apps/backend/src/services/analysis/AnalysisService.ts` : méthode `analyze(userStoryId, teamId)`
- `apps/frontend/src/hooks/useRealtime.ts` : hook `useRealtimeRow` déjà utilisé pour les générations — même pattern pour écouter les analyses
- `apps/frontend/src/pages/StoriesPage.tsx` : le bouton "Analyser tout le sprint" est visible dans la UI

---

## Règles : TypeScript strict, test-first, pas de régression, imports `.js`

---

## TÂCHE 1 — Endpoint `POST /api/analyses/batch` (test-first)

### Fichiers
- `apps/backend/src/routes/__tests__/analyses.batch.test.ts` (PREMIER)
- Modifier `apps/backend/src/routes/analyses.ts`

### Implémentation

```typescript
// Ajouter AVANT les routes existantes dans analyses.ts

// Sémaphore simple pour limiter la concurrence
async function withConcurrencyLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Set<Promise<void>> = new Set();
  
  for (const task of tasks) {
    const p = task().then(
      (value) => results.push({ status: 'fulfilled', value }),
      (reason) => results.push({ status: 'rejected', reason }),
    ).then(() => { executing.delete(p); });
    executing.add(p);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
}

// POST /api/analyses/batch
const batchSchema = z.object({
  userStoryIds: z.array(z.string().uuid()).min(1).max(50),
});

router.post('/batch', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const batchId = crypto.randomUUID();
  const { userStoryIds } = parsed.data;

  // Retour immédiat
  res.status(202).json({ batchId, total: userStoryIds.length });

  // Traitement background — max 3 en parallèle
  const tasks = userStoryIds.map((id) => () => analysisService.analyze(id, teamId));
  void withConcurrencyLimit(tasks, 3);
});
```

**⚠️ Route ordering :** `router.post('/batch', ...)` DOIT être déclaré AVANT `router.get('/:id', ...)`.

---

## TÂCHE 2 — Hook `useBatchAnalysis` (test-first)

### Fichiers
- `apps/frontend/src/hooks/useBatchAnalysis.test.ts` (PREMIER)
- `apps/frontend/src/hooks/useBatchAnalysis.ts`

### Interface

```typescript
interface BatchState {
  batchId: string | null;
  total: number;
  completed: number;
  results: Map<string, { score: number; status: 'success' | 'error' }>;
  done: boolean;
  running: boolean;
}

export function useBatchAnalysis() {
  // startBatch(userStoryIds: string[]) → POST /api/analyses/batch
  // Écouter la table analyses via Supabase Realtime pour les userStoryIds soumis
  // Quand une analyse apparaît (INSERT) avec un des userStoryIds, mettre à jour results
  // done = true quand completed === total
}
```

**Pattern Realtime :** Utiliser `supabase.channel('batch-xxx').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analyses', filter: 'team_id=eq.xxx' })` — filtrer côté client par les userStoryIds du batch.

---

## TÂCHE 3 — `BatchAnalysisModal` + `BatchSummary` (test-first)

### Fichiers
- `apps/frontend/src/components/batch/BatchAnalysisModal.test.tsx` (PREMIER)
- `apps/frontend/src/components/batch/BatchAnalysisModal.tsx`
- `apps/frontend/src/components/batch/BatchSummary.tsx`

### Modal structure

```tsx
// Modal overlay (pas de position:fixed — utiliser un div plein écran dans le flow)
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
    {/* Header : titre + barre de progression */}
    {/* Liste scrollable : US avec statuts */}
    {/* Footer conditionnel : résumé quand done, sinon rien */}
  </div>
</div>
```

### BatchSummary

```tsx
// Affiché quand done === true
// - Score moyen du batch
// - Distribution vert/jaune/rouge (counts)
// - Top 3 worst scores (cliquables → navigate vers /stories/:id)
// - Bouton "Fermer"
```

---

## TÂCHE 4 — Intégration dans StoriesPage

### Modifier `apps/frontend/src/pages/StoriesPage.tsx`

```tsx
// Ajouter state pour le modal batch
const [batchModalOpen, setBatchModalOpen] = useState(false);

// Le bouton "Analyser tout le sprint" collecte les IDs visibles
const handleBatchAnalyze = () => {
  // stories = les stories actuellement affichées (filtrées)
  setBatchModalOpen(true);
};

// Dans le JSX, après la liste :
{batchModalOpen && (
  <BatchAnalysisModal
    userStoryIds={stories.map(s => s.id)}
    onClose={() => { setBatchModalOpen(false); void fetchStories(); }}
  />
)}
```

Le bouton affiche "(X stories)" pour confirmer le nombre avant lancement.

---

## TÂCHE 5 — Vérification finale

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## Fichiers : 6 à créer, 2 à modifier

> 📝 Specs : `specs/005-batch-analysis/`
