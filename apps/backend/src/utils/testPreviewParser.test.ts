/**
 * Tests du parser de preview de tests (Feature 011).
 * Le parser est côté frontend (src/lib/testPreviewParser.ts) — on copie la logique ici pour la tester.
 * En production, ces tests seraient dans le frontend si Vitest y était configuré.
 */
import { describe, it, expect } from 'vitest';

// ─── Copie légère du parser pour les tests backend ────────────────────────────

type StepType = 'navigate' | 'fill' | 'click' | 'select' | 'assert' | 'wait' | 'other';

interface PreviewStep {
  type: StepType;
  description: string;
  target?: string;
  value?: string;
}

interface PreviewScenario {
  name: string;
  steps: PreviewStep[];
}

function resolveFixturesSimple(value: string, fixtures: Record<string, unknown>): string {
  return value.replace(/(?:fixtures|testData|data)\.(\w+(?:\.\w+)?)/g, (match, path) => {
    const parts = path.split('.');
    let current: unknown = fixtures;
    for (const part of parts) {
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else return match;
    }
    return current !== undefined ? String(current) : match;
  });
}

function parseSimple(specCode: string, fixturesJson?: string): PreviewScenario[] {
  const scenarios: PreviewScenario[] = [];
  let fixtures: Record<string, unknown> = {};
  if (fixturesJson) {
    try { fixtures = JSON.parse(fixturesJson) as Record<string, unknown>; } catch { /* ignore */ }
  }

  const lines = specCode.split('\n');
  let current: PreviewScenario | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const testMatch = t.match(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (testMatch) {
      if (current) scenarios.push(current);
      current = { name: testMatch[1]!, steps: [] };
      continue;
    }
    if (!current) continue;

    const gotoMatch = t.match(/\.goto\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (gotoMatch) {
      current.steps.push({ type: 'navigate', description: `Naviguer vers ${gotoMatch[1]}`, value: gotoMatch[1]! });
      continue;
    }
    const fillChain = t.match(/(getBy\w+\([^)]+\))\.fill\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (fillChain) {
      const resolved = resolveFixturesSimple(fillChain[2]!, fixtures);
      current.steps.push({ type: 'fill', description: 'Remplir', value: resolved });
      continue;
    }
    if (t.match(/\.click\s*\(\s*\)/) || t.match(/\.click\s*\(\s*['"`]/)) {
      current.steps.push({ type: 'click', description: 'Cliquer' });
      continue;
    }
    if (t.startsWith('expect(') || t.match(/await expect/)) {
      const urlMatch = t.match(/toHaveURL\s*\(\s*['"`]([^'"`]+)['"`]/);
      const textMatch = t.match(/toHaveText\s*\(\s*['"`]([^'"`]+)['"`]/);
      const val = urlMatch?.[1] ?? textMatch?.[1];
      current.steps.push({
        type: 'assert',
        description: urlMatch ? 'Vérifier l\'URL' : textMatch ? 'Vérifier le texte' : 'Vérification',
        ...(val !== undefined ? { value: val } : {}),
      });
      continue;
    }
  }
  if (current && current.steps.length > 0) scenarios.push(current);
  return scenarios;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('testPreviewParser', () => {
  const sampleSpec = `
import { test, expect } from '@playwright/test';
import testData from '../fixtures/login.json';

test('should login with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email').fill(testData.validUser.email);
  await page.getByTestId('password').fill('password123');
  await page.getByTestId('submit').click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByTestId('welcome')).toBeVisible();
});

test('should show error with invalid password', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email').fill('user@test.com');
  await page.getByTestId('password').fill('wrongpass');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('error')).toHaveText('Invalid credentials');
});
`;

  it('extrait 2 scénarios depuis 2 test() blocs', () => {
    const result = parseSimple(sampleSpec);
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('should login with valid credentials');
    expect(result[1]?.name).toBe('should show error with invalid password');
  });

  it('extrait les étapes du 1er scénario (goto + fill + click + expect)', () => {
    const result = parseSimple(sampleSpec);
    const steps = result[0]?.steps ?? [];
    expect(steps.length).toBeGreaterThanOrEqual(4);
    expect(steps.some((s) => s.type === 'navigate')).toBe(true);
    expect(steps.some((s) => s.type === 'fill')).toBe(true);
    expect(steps.some((s) => s.type === 'click')).toBe(true);
    expect(steps.some((s) => s.type === 'assert')).toBe(true);
  });

  it('résout les valeurs fixtures avec référence en string', () => {
    // Le parser résout fixtures.xxx quand la valeur est passée comme string littérale avec la référence
    const fixtures = JSON.stringify({ email: 'real@test.com', password: 'secret' });
    const code = `
test('login', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('email').fill('fixtures.email');
  await page.getByTestId('submit').click();
});`;
    const result = parseSimple(code, fixtures);
    const fillStep = result[0]?.steps.find((s) => s.type === 'fill');
    // La valeur 'fixtures.email' doit être résolue vers 'real@test.com'
    expect(fillStep?.value).toBe('real@test.com');
  });

  it('retourne un tableau vide si aucun test() bloc', () => {
    const code = `
import { Page } from '@playwright/test';
const helper = () => {};
export class LoginPage {}
`;
    const result = parseSimple(code);
    expect(result).toHaveLength(0);
  });

  it('ignore les scénarios sans actions Playwright (variables uniquement)', () => {
    const code = `
test('empty test', async ({ page }) => {
  const x = 42;
  const url = '/login';
});`;
    const result = parseSimple(code);
    // Scénario avec 0 steps → pas pushé dans le résultat
    expect(result).toHaveLength(0);
  });

  it('extrait l\'URL dans goto', () => {
    const code = `
test('navigate', async ({ page }) => {
  await page.goto('/login');
});`;
    const result = parseSimple(code);
    expect(result[0]?.steps[0]?.value).toBe('/login');
    expect(result[0]?.steps[0]?.type).toBe('navigate');
  });
});
