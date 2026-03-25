import ts from 'typescript';
import type { GeneratedFileResult } from './GenerationService.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileError {
  filename: string;
  line: number;
  message: string;
}

export interface ValidationResult {
  status: 'valid' | 'has_errors';
  files: GeneratedFileResult[];
  errors: FileError[];
}

// Modules connus dans les tests générés — erreurs TS2307 ignorées pour eux
const MODULE_ALLOWLIST = new Set([
  '@playwright/test',
  '@playwright/experimental-ct-react',
  'playwright',
  'selenium-webdriver',
  'cypress',
  '@testing-library/react',
  '@testing-library/jest-dom',
  'vitest',
  'jest',
  'mocha',
  'chai',
  'NUnit',
  'xunit',
  'junit',
]);

const TS_OPTIONS: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  skipLibCheck: true,    // ne résout pas node_modules
  noEmit: true,
  allowJs: true,
};

// ─── Validator ────────────────────────────────────────────────────────────────

export class CodeValidator {
  validateFiles(files: GeneratedFileResult[]): ValidationResult {
    const errors: FileError[] = [];

    for (const file of files) {
      if (file.filename.endsWith('.json')) {
        errors.push(...this.validateJSON(file.content, file.filename));
      } else if (
        file.filename.endsWith('.ts') ||
        file.filename.endsWith('.js') ||
        file.filename.endsWith('.tsx') ||
        file.filename.endsWith('.jsx')
      ) {
        errors.push(...this.validateTypeScript(file.content, file.filename));
      }
      // Ruby, C#, Java, Kotlin — pas de validator natif, on les accepte tels quels
    }

    return {
      status: errors.length === 0 ? 'valid' : 'has_errors',
      files,
      errors,
    };
  }

  validateTypeScript(content: string, filename: string): FileError[] {
    const errors: FileError[] = [];

    try {
      // Utiliser transpileModule pour les diagnostics syntaxiques et sémantiques de base
      const result = ts.transpileModule(content, {
        compilerOptions: TS_OPTIONS,
        fileName: filename,
        reportDiagnostics: true,
      });

      const diagnostics = result.diagnostics ?? [];

      for (const diag of diagnostics) {
        // Ignorer les erreurs "module not found" (TS2307) pour les modules connus
        if (diag.code === 2307) {
          const msgText = typeof diag.messageText === 'string'
            ? diag.messageText
            : (diag.messageText as ts.DiagnosticMessageChain).messageText;
          const moduleMatch = msgText.match(/Cannot find module '([^']+)'/);
          if (moduleMatch) {
            const moduleName = moduleMatch[1]!;
            // Ignorer les modules allowlistés et les imports relatifs
            if (MODULE_ALLOWLIST.has(moduleName) || moduleName.startsWith('.') || moduleName.startsWith('@/')) {
              continue;
            }
          }
        }

        // Convertir la position en numéro de ligne
        let line = 1;
        if (diag.file && diag.start !== undefined) {
          const { line: l } = diag.file.getLineAndCharacterOfPosition(diag.start);
          line = l + 1;
        }

        const message = typeof diag.messageText === 'string'
          ? diag.messageText
          : ts.flattenDiagnosticMessageText(diag.messageText, '\n');

        errors.push({ filename, line, message });
      }
    } catch (err) {
      // Erreur fatale du compiler lui-même (très rare)
      errors.push({
        filename,
        line: 1,
        message: `TypeScript compiler error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    return errors;
  }

  validateJSON(content: string, filename: string): FileError[] {
    try {
      JSON.parse(content);
      return [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid JSON';
      // Extraire le numéro de ligne depuis le message d'erreur JSON si disponible
      const lineMatch = message.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]!, 10) : 1;
      return [{ filename, line, message }];
    }
  }
}
