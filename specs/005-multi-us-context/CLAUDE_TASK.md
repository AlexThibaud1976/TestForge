# CLAUDE_TASK — 005-multi-us-context

> Contexte multi-US : registre POM partagé entre générations pour réutiliser les Page Objects.
> Usage : `claude < CLAUDE_TASK.md`

---

## Contexte

TestForge — monorepo pnpm. Voir `CLAUDE.md` à la racine.
**Spec + Plan + Tasks** : `specs/005-multi-us-context/spec.md` (contient tout)

## Règles

- TypeScript strict, aucun `any`
- Le POM Registry est par équipe, scopé par `team_id` + `framework` + `language`
- Les POM sont extraits automatiquement après chaque génération réussie
- Max 5 POM injectés dans le prompt (les plus récents)
- Conventional Commits

---

## PHASE 1 — POM Registry + Extraction (~6h)

### 1.1 — Table pom_registry

Ajouter dans `apps/backend/src/db/schema.ts` :

```typescript
export const pomRegistry = pgTable('pom_registry', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  className: text('class_name').notNull(),
  filename: text('filename').notNull(),
  methods: jsonb('methods').notNull().default([]),        // [{ name, params, returnType, jsdoc }]
  fullContent: text('full_content').notNull(),             // code complet du POM
  sourceGenerationId: uuid('source_generation_id').references(() => generations.id, { onDelete: 'set null' }),
  sourceUserStoryId: uuid('source_user_story_id').references(() => userStories.id),
  framework: text('framework').notNull(),                  // playwright | selenium | cypress
  language: text('language').notNull(),                    // typescript | javascript | python | ...
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Index unique : `(team_id, class_name, framework, language)` — un seul POM par nom de classe par stack.

Générer et appliquer la migration.

### 1.2 — PomParser

Créer `apps/backend/src/services/generation/PomParser.ts` :

Utilitaire qui extrait d'un fichier TypeScript de Page Object :
- Le nom de la classe exportée : regex `export class (\w+)`
- Les méthodes publiques : regex `(?:async\s+)?(\w+)\s*\((.*?)\)(?:\s*:\s*(.*?))?\s*\{`
- Les commentaires JSDoc : regex `/\*\*\s*(.*?)\s*\*/` avant chaque méthode

```typescript
interface PomMethod {
  name: string;
  params: string;
  returnType: string;
  jsdoc: string | null;
}

interface ParsedPom {
  className: string;
  methods: PomMethod[];
}

function parsePomFile(content: string): ParsedPom | null
```

Attention : le TypeScript compiler API serait plus fiable que regex, mais regex suffit pour v1 — les POM générés par TestForge suivent un template strict et prévisible.

### 1.3 — PomRegistryService

Créer `apps/backend/src/services/generation/PomRegistryService.ts` :

```typescript
class PomRegistryService {
  // Appelé après chaque génération réussie
  async extractAndRegister(generationId: string, teamId: string, userStoryId: string, 
                           files: GeneratedFileResult[], framework: string, language: string): Promise<void>
  
  // Appelé avant chaque génération pour injecter le contexte
  async getRelevantPom(teamId: string, framework: string, language: string, limit?: number): Promise<PomRegistryEntry[]>
  
  // Suppression manuelle
  async deletePom(pomId: string, teamId: string): Promise<void>
  
  // Liste pour le frontend
  async listPom(teamId: string): Promise<PomRegistryEntry[]>
}
```

`extractAndRegister` :
1. Filtrer les fichiers de type `page_object`
2. Parser avec `PomParser`
3. Upsert dans `pom_registry` (on conflict sur `team_id + class_name + framework + language` → update)

`getRelevantPom` :
- v1 : retourner les N plus récents pour le même `(team_id, framework, language)`
- v2 future : filtrer par pertinence sémantique basée sur le titre de l'US

### 1.4 — Intégration dans GenerationService

Modifier `apps/backend/src/services/generation/GenerationService.ts` :

Dans `processGeneration()`, APRÈS la persistance des fichiers :
```typescript
const pomRegistry = new PomRegistryService();
await pomRegistry.extractAndRegister(generationId, teamId, story.id, parsedFiles, framework, language);
```

### 1.5 — Tests

- `PomParser` : code POM standard → extrait classe + 3 méthodes. Code sans export class → retourne null.
- `PomRegistryService.extractAndRegister` : génération avec POM → 1 entrée en DB. Même POM régénéré → update (pas de doublon).
- `PomRegistryService.getRelevantPom` : 5 POM en DB → retourne les 5.

---

## PHASE 2 — Injection dans le prompt (~4h)

### 2.1 — Charger les POM avant génération

Dans `processGeneration()`, AVANT l'appel LLM :

```typescript
const existingPom = await pomRegistry.getRelevantPom(teamId, framework, language, 5);
```

### 2.2 — Construire la section prompt

Si `existingPom.length > 0`, construire une section :

```
## Existing Page Objects (REUSE these, do NOT recreate)

You MUST import and reuse these Page Objects instead of creating new ones with the same name.
If you need additional methods on an existing POM, describe them in a comment but do NOT redefine the class.

### LoginPage (pages/LoginPage.page.ts)
- constructor(page: Page)
- async goto(): Promise<void>  /** Navigates to the login page */
- async login(email: string, password: string): Promise<void>  /** Fills and submits login form */
- async getErrorMessage(): Promise<string>  /** Returns the error message text */
```

Si `existingPom.length <= 3`, inclure le `fullContent` complet pour plus de contexte. Si > 3, inclure uniquement les signatures (le context window est limité).

Injecter cette section dans le system prompt, après le template POM de l'équipe (s'il existe).

### 2.3 — Ajouter l'instruction dans le system prompt

Ajouter dans le system prompt de génération (`generation-v1.0.ts` ou version suivante) :

```
Si des Page Objects existants sont listés ci-dessous :
- Tu DOIS les importer via `import { ClassName } from '../pages/ClassName.page'`
- Tu ne DOIS JAMAIS recréer une classe qui existe déjà
- Si tu as besoin de méthodes supplémentaires sur un POM existant, ajoute un commentaire `// TODO: add method xyz() to ClassName` mais NE redéfinis PAS la classe
```

### 2.4 — Tests

- Génération avec 2 POM existants → le prompt contient "Existing Page Objects" avec les 2 classes
- Génération sans POM → pas de section (comportement V1, pas de régression)
- Vérifier que le code généré contient `import { LoginPage }` et non `export class LoginPage`

---

## PHASE 3 — Frontend registre POM (~4h)

- Créer `apps/frontend/src/pages/PomRegistryPage.tsx` — table avec : classe, fichier, N méthodes, US source, date, bouton supprimer
- Route `GET /api/pom-registry` + `DELETE /api/pom-registry/:id` dans un nouveau routeur ou dans `pom-templates.ts`
- Route `/settings/pom-registry` dans `App.tsx`

---

## PHASE 4 — Détection de conflits (P2, ~4h)

- Dans `extractAndRegister()`, si un POM avec le même `className` existe déjà, comparer les méthodes
- Si les méthodes diffèrent → retourner un flag `conflict`
- Frontend : dialog de résolution (garder / remplacer / ignorer)

---

## Vérification

```bash
pnpm --filter backend test && pnpm --filter backend typecheck
git commit -m "feat: 005-multi-us-context — shared POM registry across generations"
```
