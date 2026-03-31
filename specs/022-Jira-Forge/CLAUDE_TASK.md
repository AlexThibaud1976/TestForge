# CLAUDE_TASK — 012-jira-forge-extension
> Utilisation : `claude < CLAUDE_TASK.md`
> Branche : `git checkout -b 012-jira-forge-extension`

---

## Contexte projet

TestForge est un SaaS B2B (monorepo pnpm) qui transforme des user stories Jira/ADO en tests automatisés Playwright/Selenium/Cypress via LLM.

Stack : React 18 + Vite + TypeScript + shadcn/ui (frontend) | Node.js 20 + Express + Drizzle ORM + Supabase PostgreSQL (backend).

**Cette feature ajoute une Jira Forge App** — un panel qui s'affiche dans chaque issue Jira et montre le score de testabilité TestForge.

Lire `specs/012-jira-forge-extension/spec.md`, `plan.md` et `tasks.md` pour les détails complets.

---

## Règles de dev obligatoires

- **Test-first (Red → Green → Refactor)** sans exception — écrire les tests AVANT l'implémentation
- TypeScript strict, zéro `any` implicite
- Aucune breaking change sur les routes API existantes
- Toute nouvelle route Express doit être documentée dans `plan.md`
- Non-régression : lancer `pnpm test` après chaque phase et corriger avant de continuer

---

## Implémentation

### Phase 1 — API Tokens backend

**1a. Schema DB**

Ajouter dans `apps/backend/src/db/schema.ts` :

```typescript
export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
```

Générer la migration : `pnpm --filter backend drizzle-kit generate`.

**1b. ApiTokenService**

Créer `apps/backend/src/services/apiTokens/ApiTokenService.ts` :
- `generate(teamId: string, name: string)` : génère `tf_` + 32 octets aléatoires hex, stocke `SHA-256(token)`, retourne `{ tokenRaw, id, name }`
- `validate(tokenRaw: string)` : hash le token, cherche en DB, vérifie `revokedAt IS NULL`, met à jour `lastUsedAt`, retourne `{ teamId, teamName } | null`
- `revoke(id: string, teamId: string)` : soft delete (set `revokedAt = now()`), vérifie ownership
- `list(teamId: string)` : retourne tous les tokens non révoqués

**1c. Routes**

Créer `apps/backend/src/routes/tokens.ts` :
- `GET /api/tokens` — JWT auth (middleware `requireAuth` existant)
- `POST /api/tokens` — body `{ name: string }`, retourner token UNE SEULE FOIS
- `DELETE /api/tokens/:id` — JWT auth, soft delete

Créer `apps/backend/src/routes/jiraPanel.ts` :
- `POST /api/jira-panel/token/validate` — pas d'auth, body `{ token }`, retourne `{ valid, teamName }`

Enregistrer dans `apps/backend/src/index.ts`.

---

### Phase 2 — Scoring Heuristique

Créer `apps/backend/src/services/heuristic/HeuristicScoringService.ts`.

Méthode principale : `score(summary: string, description: string): JiraPanelScore`

Implémenter les 3 dimensions avec les règles décrites dans `plan.md §3`. Retourner un objet `JiraPanelScore` avec `mode: 'heuristic'`.

Ajouter route `GET /api/jira-panel/score` dans `jiraPanel.ts` — sans `Authorization` header → appeler `HeuristicScoringService`.

---

### Phase 3 — Mode Authentifié

Compléter `GET /api/jira-panel/score` pour la branche authentifiée :
1. Extraire Bearer token du header
2. Appeler `ApiTokenService.validate(token)` → teamId
3. Chercher `sourceConnection` où `cloudId` = param `cloudId` ET `teamId` correspond
4. Chercher `userStory` où `externalId = issueKey` dans cette connexion
5. Si trouvée et analyse existante → mapper vers `JiraPanelScore` (mode `'llm'`)
6. Sinon → `{ mode: 'llm', status: 'not_analyzed', testforgeUrl: '...' }`

Ajouter `POST /api/jira-panel/analyze` :
- Valider token + cloudId
- Trouver/créer userStory
- Déléguer à `AnalysisService` existant (NE PAS dupliquer la logique)
- Retourner `202 Accepted` + `{ analysisId }`

---

### Phase 4 — Setup Forge

```bash
npm install -g @forge/cli
cd apps
forge create --template ui-kit-2  # choisir Custom UI
mv jira-forge-app jira-forge
```

Configurer `manifest.yml` avec le module `jira:issuePanel` et les permissions (voir `plan.md §2`).

Ajouter `apps/jira-forge` aux workspaces pnpm dans `pnpm-workspace.yaml`.

Configurer TypeScript strict dans `apps/jira-forge/tsconfig.json`.

---

### Phase 5 — UI Extension

Créer les composants dans `apps/jira-forge/src/frontend/` selon les wireframes de `spec.md §5` et la structure de `plan.md §2`.

Ordre recommandé : hooks (`useForgeContext`, `useTokenStorage`, `useTestForgeScore`) → composants feuilles (`ScoreGauge`, `DimensionBars`, `SuggestionList`, `LoadingState`) → panels (`AnonymousPanel`, `AuthPanel`, `NotAnalyzedPanel`) → `App.tsx`.

Couleurs TestForge : primaire `#2563eb`, succès `#16a34a`, warning `#d97706`, danger `#dc2626`.

---

### Phase 6 — Section Tokens dans Settings

Dans `apps/frontend/src/pages/SettingsPage.tsx`, ajouter un onglet ou section "API Tokens" avec :
- `ApiTokensList` : tableau shadcn/ui avec nom, dates, bouton Révoquer
- `CreateTokenDialog` : Dialog shadcn avec champ nom → génère → affiche token avec bouton Copier (message : "Ce token ne sera plus affiché — copiez-le maintenant")

---

### Phase 7 — Docs

- Mettre à jour `README.md` : section "Jira Forge Extension"
- Mettre à jour `apps/frontend/src/pages/UserGuideDocs.tsx` : section "Connecter l'extension Jira"

---

## Commit

```
feat: 012-jira-forge-extension — Jira panel with heuristic + LLM scoring
```
