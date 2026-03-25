# CLAUDE_TASK — 004-code-validation

> Validation syntaxique du code généré + self-healing loop (correction automatique par LLM).
> Usage : `claude < CLAUDE_TASK.md`

---

## Contexte

TestForge — monorepo pnpm. Voir `CLAUDE.md` à la racine.
**Spec + Plan + Tasks** : `specs/004-code-validation/plan.md` (contient tout)

## Règles

- TypeScript strict, aucun `any`
- Le package `typescript` est déjà dans les dépendances (utilisé pour le build) — réutiliser
- Les appels LLM de correction passent par `createLLMClient()` comme le reste
- Max 2 retries de correction — hard limit
- Conventional Commits

---

## PHASE 1 — CodeValidator (~5h)

### 1.1 — Créer CodeValidator

Fichier : `apps/backend/src/services/generation/CodeValidator.ts`

```typescript
import ts from 'typescript';

interface FileError {
  filename: string;
  line: number;
  message: string;
}

interface ValidationResult {
  status: 'valid' | 'has_errors';
  errors: FileError[];
}

class CodeValidator {
  validateFiles(files: GeneratedFileResult[]): ValidationResult {
    const errors: FileError[] = [];
    for (const file of files) {
      if (file.filename.endsWith('.json')) {
        errors.push(...this.validateJSON(file.content, file.filename));
      } else if (file.filename.endsWith('.ts') || file.filename.endsWith('.js')) {
        errors.push(...this.validateTypeScript(file.content, file.filename));
      }
    }
    return { status: errors.length === 0 ? 'valid' : 'has_errors', errors };
  }

  validateTypeScript(content: string, filename: string): FileError[] {
    // Utiliser ts.transpileModule avec des compilerOptions stricts
    // Capter les diagnostics et les convertir en FileError[]
  }

  validateJSON(content: string, filename: string): FileError[] {
    // JSON.parse dans un try/catch
  }
}
```

Pour `ts.transpileModule()`, utiliser ces options :
```typescript
const options: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  skipLibCheck: true, // important — on ne résout pas les node_modules
  noEmit: true,
};
```

Note : `transpileModule` ne fait pas de résolution d'imports cross-fichiers. Les imports Playwright (`@playwright/test`) seront des "module not found" — il faut les ignorer (filtrer les erreurs TS2307 pour les modules connus). Créer une allowlist : `['@playwright/test', '@playwright/experimental-ct-react', 'playwright', ...]`.

### 1.2 — Migration

Ajouter 3 colonnes sur `generations` dans le schéma Drizzle :
- `validation_status` text default 'skipped'
- `validation_errors` jsonb default '[]'
- `correction_attempts` integer default 0

Générer et appliquer la migration.

### 1.3 — Intégration dans GenerationService

Modifier `apps/backend/src/services/generation/GenerationService.ts` :

Dans `processGeneration()`, après le parsing JSON des fichiers et AVANT la persistance dans `generated_files`, ajouter :

```typescript
const validator = new CodeValidator();
const validation = validator.validateFiles(parsedFiles);
// stocker validation_status et validation_errors sur le record generation
```

### 1.4 — Tests unitaires

Fichier : `apps/backend/src/services/generation/CodeValidator.test.ts`

Tests :
- Code TS valide (import Playwright, classe POM, test.describe) → status 'valid'
- Code TS avec `const x: number = "string"` → détecte l'erreur de type
- Code TS avec syntaxe invalide → détecte l'erreur de syntaxe
- JSON valide → pas d'erreurs
- JSON invalide (virgule trailing) → erreur détectée
- Import `@playwright/test` → PAS une erreur (allowlist)

---

## PHASE 2 — Self-Healing Loop (~4h)

### 2.1 — Prompt de correction

Créer `apps/backend/src/services/generation/prompts/correction-v1.0.ts` :

```typescript
export function buildCorrectionPrompt(filename: string, code: string, errors: FileError[]): string {
  // Retourne un prompt demandant de corriger UNIQUEMENT les erreurs listées
  // Sans modifier la logique, la structure POM ou les données
  // Format de réponse : JSON { "filename": "...", "content": "..." }
}
```

### 2.2 — Méthode selfHeal

Ajouter dans `GenerationService` ou dans `CodeValidator` :

```typescript
async selfHeal(
  files: GeneratedFileResult[],
  errors: FileError[],
  client: LLMClient,
  maxRetries = 2
): Promise<{ files: GeneratedFileResult[]; status: 'auto_corrected' | 'has_errors'; attempts: number; remainingErrors: FileError[] }>
```

Pour chaque fichier en erreur :
1. Construire le prompt de correction
2. Appeler `client.complete()` avec temperature 0.1 (corrections précises)
3. Parser la réponse (fichier corrigé)
4. Re-valider avec `CodeValidator`
5. Si toujours en erreur et retries restants → recommencer
6. Timeout 30s par retry

### 2.3 — Intégration

Dans `processGeneration()`, si la validation détecte des erreurs :
```typescript
if (validation.status === 'has_errors') {
  const healed = await this.selfHeal(parsedFiles, validation.errors, client);
  // utiliser healed.files et healed.status
}
```

### 2.4 — Tests

- LLM retourne un code corrigé valide au 1er retry → status 'auto_corrected', attempts 1
- LLM retourne un code encore invalide, puis valide au 2e retry → attempts 2
- LLM échoue 2 fois → status 'has_errors', erreurs résiduelles stockées

---

## PHASE 3 — Frontend badges (~3h)

- Ajouter `validationStatus`, `validationErrors`, `correctionAttempts` dans le type `Generation` (shared-types)
- Badge coloré dans le composant qui affiche la génération :
  - Vert "✓ Code validé" si valid
  - Orange "Corrigé (N corrections)" si auto_corrected
  - Rouge "⚠ Erreurs détectées" si has_errors → expandable liste erreurs

---

## Vérification

```bash
pnpm --filter backend test && pnpm --filter backend typecheck
git commit -m "feat: 004-code-validation — syntactic validation with self-healing loop"
```
