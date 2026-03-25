# Implementation Plan: Code Validation & Self-Healing

**Branch**: `004-code-validation` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

Intégrer une étape de validation syntaxique dans `GenerationService.processGeneration()` après le parsing JSON. Utiliser le TypeScript Compiler API (`typescript` package, déjà dispo dans le repo) pour transpiler chaque fichier `.ts`. En cas d'erreur, construire un prompt de correction et relancer le LLM (max 2 retries).

## Architecture

```
[GenerationService.processGeneration()]
       │ LLM retourne JSON avec fichiers
       ▼
[CodeValidator.validate(files)]
  │ Pour chaque .ts : ts.transpileModule()
  │ Pour chaque .json : JSON.parse()
  ▼
  ├─ Pas d'erreurs → retourne files + status: 'valid'
  │
  └─ Erreurs détectées → [SelfHealingLoop]
       │ Construit prompt: code + erreurs + instruction de correction
       │ LLM.complete() → nouveau code
       │ Re-validate
       │ Max 2 retries
       ▼
       ├─ Corrigé → retourne files corrigés + status: 'auto_corrected'
       └─ Toujours invalide → retourne files + status: 'has_errors' + erreurs
```

### CodeValidator

Nouveau module : `apps/backend/src/services/generation/CodeValidator.ts`

```typescript
interface ValidationResult {
  status: 'valid' | 'has_errors';
  files: GeneratedFileResult[];
  errors: FileError[];
}

interface FileError {
  filename: string;
  line: number;
  message: string;
}

class CodeValidator {
  validateFiles(files: GeneratedFileResult[]): ValidationResult
  validateTypeScript(content: string, filename: string): FileError[]
  validateJSON(content: string, filename: string): FileError[]
}
```

### Self-Healing Prompt

```
Le code suivant contient des erreurs de compilation TypeScript.
Corrige UNIQUEMENT les erreurs listées ci-dessous sans modifier la logique, la structure POM ou les données.

## Fichier : {filename}
{code}

## Erreurs détectées :
- Ligne {line}: {message}
- Ligne {line}: {message}

Retourne le fichier corrigé complet au format JSON :
{ "filename": "{filename}", "content": "..." }
```

### Colonnes ajoutées

Sur `generations` :
- `validation_status` (text) : `'valid'` | `'auto_corrected'` | `'has_errors'` | `'skipped'`
- `validation_errors` (jsonb) : `[{ filename, line, message }]` — erreurs résiduelles
- `correction_attempts` (integer) : 0, 1, ou 2

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — CodeValidator + intégration GenerationService | ~5h |
| Phase 2 — Self-healing loop (prompt correction + retries) | ~4h |
| Phase 3 — Frontend (badges + affichage erreurs) | ~3h |
| **Total** | **~12h** |

---

# Tasks — Code Validation & Self-Healing

---

## Phase 1: CodeValidator (~5h)

**Goal**: Valider chaque fichier généré syntaxiquement. Intégrer dans le flow de génération existant.

- [ ] T001 [P] Créer `apps/backend/src/services/generation/CodeValidator.ts` :
  - `validateFiles(files[])` — itère sur les fichiers, dispatch vers validateTS ou validateJSON
  - `validateTypeScript(content, filename)` — `ts.transpileModule()` avec `compilerOptions: { strict: true, target: ES2022, module: ESNext, jsx: 'react-jsx' }`, retourne les diagnostics
  - `validateJSON(content, filename)` — `JSON.parse()` dans un try/catch
- [ ] T002 [P] Ajouter migration : 3 colonnes sur `generations` (`validation_status`, `validation_errors`, `correction_attempts`)
- [ ] T003 [P] Intégrer `CodeValidator.validateFiles()` dans `GenerationService.processGeneration()` — après le parsing des fichiers, avant la persistance. Stocker le résultat dans les nouvelles colonnes
- [ ] T004 Tests unitaires `CodeValidator` :
  - Code TS valide → status 'valid', pas d'erreurs
  - Code TS avec import manquant → détecte l'erreur avec ligne + message
  - Code TS avec type incorrect → détecte l'erreur
  - JSON valide → pas d'erreurs
  - JSON invalide → erreur détectée
- [ ] T005 Vérifier que les générations existantes continuent de fonctionner (régression)

**Checkpoint** : les générations retournent un `validation_status` sur chaque record.

---

## Phase 2: Self-Healing Loop (~4h)

**Goal**: Relancer le LLM avec les erreurs pour corriger automatiquement le code.

- [ ] T006 [P] Créer le prompt de correction dans `apps/backend/src/services/generation/prompts/correction-v1.0.ts` — exporter `buildCorrectionPrompt(filename, code, errors[])`
- [ ] T007 [P] Ajouter méthode `selfHeal(files, errors, llmClient, maxRetries = 2)` dans `CodeValidator` ou `GenerationService` :
  - Pour chaque fichier avec erreurs : construire le prompt de correction, appeler LLM
  - Parser la réponse (fichier corrigé)
  - Re-valider
  - Si toujours en erreur et retries restants → recommencer
  - Retourner le statut final ('auto_corrected' ou 'has_errors')
- [ ] T008 Intégrer le self-healing dans `processGeneration()` — si `validateFiles()` retourne des erreurs, lancer `selfHeal()`
- [ ] T009 Tests unitaires self-healing :
  - LLM corrige du premier coup → status 'auto_corrected', correction_attempts = 1
  - LLM corrige au 2e essai → status 'auto_corrected', correction_attempts = 2
  - LLM échoue 2 fois → status 'has_errors', erreurs retournées
- [ ] T010 Vérifier que le temps total n'explose pas — ajouter un timeout de 30s par retry

**Checkpoint** : le code généré est automatiquement corrigé si possible.

---

## Phase 3: Frontend — Badges + Erreurs (~3h)

- [ ] T011 Ajouter un badge de validation dans `apps/frontend/src/components/CodeViewer.tsx` (ou le composant qui affiche le code généré) :
  - Vert "Code validé ✓" si validation_status = 'valid'
  - Orange "Corrigé automatiquement (N corrections)" si 'auto_corrected'
  - Rouge "⚠️ Erreurs de compilation" si 'has_errors'
- [ ] T012 Si 'has_errors' : afficher la liste des erreurs sous le code (filename, ligne, message) avec coloration syntaxique
- [ ] T013 Ajouter `validation_status` dans le type `Generation` dans `packages/shared-types/src/index.ts`

**Checkpoint** : l'utilisateur voit le statut de validation sur chaque génération.
