import { describe, it, expect } from 'vitest';
import { CodeValidator } from './CodeValidator.js';

const validator = new CodeValidator();

// ─── TypeScript validation ─────────────────────────────────────────────────────

describe('CodeValidator — TypeScript', () => {
  it('code Playwright POM valide → status valid', () => {
    const content = `
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email');
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }
}
`;
    const errors = validator.validateTypeScript(content, 'pages/Login.page.ts');
    expect(errors).toHaveLength(0);
  });

  it('import @playwright/test → PAS une erreur (allowlist)', () => {
    const content = `
import { test, expect } from '@playwright/test';

test('login works', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle('Login');
});
`;
    const errors = validator.validateTypeScript(content, 'tests/login.spec.ts');
    // Les erreurs TS2307 pour @playwright/test doivent être ignorées
    const moduleErrors = errors.filter((e) => e.message.includes('@playwright/test'));
    expect(moduleErrors).toHaveLength(0);
  });

  it('déclaration de type invalide → erreur de syntaxe détectée', () => {
    // transpileModule détecte les erreurs de syntaxe TypeScript
    const content = `
const x: = "valeur sans type valide";
`;
    const errors = validator.validateTypeScript(content, 'test.ts');
    // Doit détecter une erreur de syntaxe (Expression attendue)
    expect(errors.length).toBeGreaterThan(0);
  });

  it('syntaxe invalide → détectée', () => {
    const content = `
function broken( {
  return 42
}
`;
    const errors = validator.validateTypeScript(content, 'broken.ts');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('code TypeScript valide sans imports → status valid', () => {
    const content = `
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`;
    const errors = validator.validateTypeScript(content, 'Calculator.ts');
    expect(errors).toHaveLength(0);
  });
});

// ─── JSON validation ───────────────────────────────────────────────────────────

describe('CodeValidator — JSON', () => {
  it('JSON valide → pas d\'erreurs', () => {
    const content = JSON.stringify({ validUser: { email: 'test@test.com' } }, null, 2);
    const errors = validator.validateJSON(content, 'fixtures/login.json');
    expect(errors).toHaveLength(0);
  });

  it('JSON invalide (virgule trailing) → erreur détectée', () => {
    const content = `{
  "email": "test@test.com",
}`;
    const errors = validator.validateJSON(content, 'fixtures/login.json');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.filename).toBe('fixtures/login.json');
  });

  it('JSON complètement invalide → erreur détectée', () => {
    const errors = validator.validateJSON('not json at all!!!', 'fixtures/bad.json');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── validateFiles ─────────────────────────────────────────────────────────────

describe('CodeValidator — validateFiles', () => {
  it('tous les fichiers valides → status valid', () => {
    const files = [
      { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
      { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{"email":"test@test.com"}' },
    ];
    const result = validator.validateFiles(files);
    expect(result.status).toBe('valid');
    expect(result.errors).toHaveLength(0);
  });

  it('un fichier JSON invalide → status has_errors', () => {
    const files = [
      { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: 'export class LoginPage {}' },
      { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{invalid json' },
    ];
    const result = validator.validateFiles(files);
    expect(result.status).toBe('has_errors');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.filename).toBe('fixtures/login.json');
  });

  it('fichiers Ruby ignorés (pas d\'erreur) → status valid', () => {
    const files = [
      { type: 'page_object' as const, filename: 'pages/login_page.rb', content: 'def broken_ruby( end' },
      { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{}' },
    ];
    // Ruby n'est pas validé — doit passer
    const result = validator.validateFiles(files);
    expect(result.status).toBe('valid');
  });
});
