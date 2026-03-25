# Data Model — Manual Test First

**Branch**: `002-manual-test-first` | **Date**: 2026-03-25

---

## Nouvelles Tables

### `manual_test_sets`

Un lot de tests manuels générés pour une analyse donnée. Un seul lot actif par analyse (le dernier remplace le précédent, mais l'historique est conservé via `version`).

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `analysis_id` | uuid FK → analyses | onDelete cascade |
| `team_id` | uuid FK → teams | isolation multi-tenant |
| `user_story_id` | uuid FK → user_stories | pour accès direct |
| `status` | text | `'draft'` \| `'validated'` \| `'pushed'` |
| `used_improved_version` | boolean | true si généré depuis la version améliorée |
| `version` | integer | 1, 2, 3... (incrémenté à chaque régénération) |
| `excluded_criteria` | jsonb | `[{ criterion, reason }]` — AC non testables manuellement |
| `llm_provider` | text | Provider utilisé pour la génération |
| `llm_model` | text | Modèle utilisé |
| `prompt_version` | text | Version du prompt manual-test |
| `validated_at` | timestamptz | null si status ≠ validated |
| `validated_by` | uuid | userId Supabase de l'auteur de la validation |
| `pushed_at` | timestamptz | null si jamais pushé |
| `push_target` | text | `'xray'` \| `'ado'` \| null |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Index** : `(analysis_id)` — récupérer le lot de tests d'une analyse.
**Index** : `(team_id, user_story_id)` — lister les lots par US pour une équipe.

---

### `manual_test_cases`

Un cas de test manuel individuel, rattaché à un lot.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `manual_test_set_id` | uuid FK → manual_test_sets | onDelete cascade |
| `team_id` | uuid FK → teams | isolation multi-tenant |
| `title` | text | Titre du cas de test |
| `precondition` | text | Précondition (nullable) |
| `priority` | text | `'critical'` \| `'high'` \| `'medium'` \| `'low'` |
| `category` | text | `'happy_path'` \| `'error_case'` \| `'edge_case'` \| `'other'` |
| `steps` | jsonb | `[{ stepNumber, action, expectedResult }]` |
| `sort_order` | integer | Ordre d'affichage dans le lot |
| `external_id` | text | ID dans l'outil externe (ex: `XRAY-123`, `456`) — null si pas pushé |
| `external_url` | text | Lien direct vers le test externe — null si pas pushé |
| `external_source` | text | `'xray'` \| `'ado'` \| null |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Index** : `(manual_test_set_id, sort_order)` — liste ordonnée des cas de test.
**Index** : `(external_id, external_source)` — lookup par ID externe pour la resync.

---

## Colonnes ajoutées sur tables existantes

### `generations` — +1 colonne

| Colonne | Type | Notes |
|---|---|---|
| `manual_test_set_id` | uuid FK → manual_test_sets | nullable — lien vers le lot de tests manuels utilisé pour la génération |

**Migration** : `ALTER TABLE generations ADD COLUMN manual_test_set_id uuid REFERENCES manual_test_sets(id) ON DELETE SET NULL;`

---

## Relations

```
user_stories  1 ──── N  analyses
analyses      1 ──── N  manual_test_sets
manual_test_sets  1 ──── N  manual_test_cases
manual_test_sets  1 ──── N  generations (via manual_test_set_id)
```

Le lien `manual_test_sets → generations` est optionnel : une génération auto peut exister sans tests manuels (comportement V1 inchangé), et des tests manuels peuvent exister sans génération auto (valeur standalone).

---

## Schéma Drizzle (à ajouter dans `apps/backend/src/db/schema.ts`)

```typescript
export const manualTestSets = pgTable('manual_test_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userStoryId: uuid('user_story_id').notNull().references(() => userStories.id),
  status: text('status').notNull().default('draft'),          // draft | validated | pushed
  usedImprovedVersion: boolean('used_improved_version').notNull().default(false),
  version: integer('version').notNull().default(1),
  excludedCriteria: jsonb('excluded_criteria').default([]),
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  validatedBy: uuid('validated_by'),
  pushedAt: timestamp('pushed_at', { withTimezone: true }),
  pushTarget: text('push_target'),                            // xray | ado | null
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const manualTestCases = pgTable('manual_test_cases', {
  id: uuid('id').defaultRandom().primaryKey(),
  manualTestSetId: uuid('manual_test_set_id').notNull().references(() => manualTestSets.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  precondition: text('precondition'),
  priority: text('priority').notNull().default('medium'),     // critical | high | medium | low
  category: text('category').notNull().default('happy_path'), // happy_path | error_case | edge_case | other
  steps: jsonb('steps').notNull().default([]),                // [{ stepNumber, action, expectedResult }]
  sortOrder: integer('sort_order').notNull().default(0),
  externalId: text('external_id'),                            // XRAY-123 or ADO TC id
  externalUrl: text('external_url'),
  externalSource: text('external_source'),                    // xray | ado | null
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## Migration SQL

```sql
-- 002: Manual Test First tables
CREATE TABLE manual_test_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_story_id UUID NOT NULL REFERENCES user_stories(id),
  status TEXT NOT NULL DEFAULT 'draft',
  used_improved_version BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  excluded_criteria JSONB DEFAULT '[]',
  llm_provider TEXT NOT NULL,
  llm_model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  pushed_at TIMESTAMPTZ,
  push_target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_test_sets_analysis ON manual_test_sets(analysis_id);
CREATE INDEX idx_manual_test_sets_team_story ON manual_test_sets(team_id, user_story_id);

CREATE TABLE manual_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_test_set_id UUID NOT NULL REFERENCES manual_test_sets(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  precondition TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'happy_path',
  steps JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  external_id TEXT,
  external_url TEXT,
  external_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_test_cases_set ON manual_test_cases(manual_test_set_id, sort_order);
CREATE INDEX idx_manual_test_cases_external ON manual_test_cases(external_id, external_source);

-- Add link from generations to manual test sets
ALTER TABLE generations ADD COLUMN manual_test_set_id UUID REFERENCES manual_test_sets(id) ON DELETE SET NULL;
```
