// ─── Types ────────────────────────────────────────────────────────────────────

export type StepType = 'navigate' | 'fill' | 'click' | 'select' | 'assert' | 'wait' | 'other';

export interface PreviewStep {
  type: StepType;
  description: string;  // "Navigate to /login"
  target?: string;      // sélecteur ou rôle
  value?: string;       // URL, texte, valeur attendue
  rawCode: string;      // ligne de code originale
}

export interface PreviewScenario {
  name: string;         // nom du test()
  steps: PreviewStep[];
}

// ─── Icônes par type ─────────────────────────────────────────────────────────

export const STEP_ICONS: Record<StepType, string> = {
  navigate: '🌐',
  fill: '✏️',
  click: '👆',
  select: '🔽',
  assert: '✅',
  wait: '⏳',
  other: '⚙️',
};

// ─── Résolution des fixtures ──────────────────────────────────────────────────

function resolveFixtures(value: string, fixtures: Record<string, unknown>): string {
  // Remplace fixtures.xxx ou testData.xxx par la valeur réelle
  return value.replace(/(?:fixtures|testData|data)\.(\w+(?:\.\w+)?)/g, (match, path) => {
    const parts = path.split('.');
    let current: unknown = fixtures;
    for (const part of parts) {
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    return current !== undefined ? String(current) : match;
  });
}

// ─── Extraction du sélecteur ─────────────────────────────────────────────────

function extractSelector(expr: string): string {
  // page.getByTestId('xxx') → 'xxx'
  const testIdMatch = expr.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
  if (testIdMatch) return `[data-testid="${testIdMatch[1]}"]`;

  // page.getByRole('xxx', ...) → 'xxx'
  const roleMatch = expr.match(/getByRole\(['"`]([^'"`]+)['"`]/);
  if (roleMatch) return `role="${roleMatch[1]}"`;

  // page.getByLabel('xxx') → 'xxx'
  const labelMatch = expr.match(/getByLabel\(['"`]([^'"`]+)['"`]\)/);
  if (labelMatch) return `label="${labelMatch[1]}"`;

  // page.getByPlaceholder('xxx') → 'xxx'
  const placeholderMatch = expr.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]\)/);
  if (placeholderMatch) return `placeholder="${placeholderMatch[1]}"`;

  // Sélecteur CSS direct
  const cssMatch = expr.match(/['"`]([^'"`]+)['"`]/);
  if (cssMatch) return cssMatch[1]!;

  return expr.trim().slice(0, 40);
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseTestSpec(specCode: string, fixturesJson?: string): PreviewScenario[] {
  const scenarios: PreviewScenario[] = [];
  let fixtures: Record<string, unknown> = {};

  // Parser les fixtures si disponibles
  if (fixturesJson) {
    try {
      const parsed = JSON.parse(fixturesJson) as Record<string, unknown>;
      // Aplatir un niveau (ex: { validUser: { email: '...' } } → { 'validUser.email': '...' })
      function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
        return Object.entries(obj).reduce((acc, [k, v]) => {
          const key = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            Object.assign(acc, flatten(v as Record<string, unknown>, key));
          }
          acc[key] = v;
          return acc;
        }, {} as Record<string, unknown>);
      }
      fixtures = { ...parsed, ...flatten(parsed) };
    } catch {
      // fixtures invalides → ignorer
    }
  }

  const lines = specCode.split('\n');
  let currentScenario: PreviewScenario | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // ── Nouveau scénario : test('...', async ──────────────────────────────
    const testMatch = trimmed.match(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (testMatch) {
      if (currentScenario) scenarios.push(currentScenario);
      currentScenario = { name: testMatch[1]!, steps: [] };
      continue;
    }

    if (!currentScenario) continue;

    // ── navigate / goto ───────────────────────────────────────────────────
    const gotoMatch = trimmed.match(/\.goto\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (gotoMatch) {
      currentScenario.steps.push({
        type: 'navigate',
        description: `Naviguer vers ${resolveFixtures(gotoMatch[1]!, fixtures)}`,
        value: resolveFixtures(gotoMatch[1]!, fixtures),
        rawCode: trimmed,
      });
      continue;
    }

    // ── fill ─────────────────────────────────────────────────────────────
    const fillMatch = trimmed.match(/\.fill\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*['"`]([^'"`]*)['"`])?\s*\)/);
    const fillChainMatch = trimmed.match(/(getBy\w+\([^)]+\))\.fill\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (fillChainMatch) {
      const resolved = resolveFixtures(fillChainMatch[2]!, fixtures);
      currentScenario.steps.push({
        type: 'fill',
        description: `Remplir ${extractSelector(fillChainMatch[1]!)}`,
        target: extractSelector(fillChainMatch[1]!),
        value: resolved,
        rawCode: trimmed,
      });
      continue;
    }
    if (fillMatch) {
      const resolved = resolveFixtures(fillMatch[2] ?? '', fixtures);
      currentScenario.steps.push({
        type: 'fill',
        description: `Remplir ${fillMatch[1]}`,
        target: fillMatch[1]!,
        value: resolved,
        rawCode: trimmed,
      });
      continue;
    }

    // ── click ─────────────────────────────────────────────────────────────
    const clickChainMatch = trimmed.match(/(getBy\w+\([^)]+\)|page\.\w+\([^)]*\))\.click\s*\(\)/);
    if (clickChainMatch || trimmed.match(/\.click\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/)) {
      const selectorExpr = clickChainMatch?.[1] ?? trimmed.match(/\.click\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/)?.[1] ?? '';
      currentScenario.steps.push({
        type: 'click',
        description: `Cliquer sur ${extractSelector(selectorExpr)}`,
        target: extractSelector(selectorExpr),
        rawCode: trimmed,
      });
      continue;
    }
    if (trimmed.match(/\.click\s*\(\s*\)/)) {
      const prevChain = trimmed.match(/((?:getBy\w+|page\.locator)\([^)]+\))\s*\.click/);
      currentScenario.steps.push({
        type: 'click',
        description: `Cliquer${prevChain ? ` sur ${extractSelector(prevChain[1]!)}` : ''}`,
        target: prevChain ? extractSelector(prevChain[1]!) : undefined,
        rawCode: trimmed,
      });
      continue;
    }

    // ── select / selectOption ─────────────────────────────────────────────
    const selectMatch = trimmed.match(/\.selectOption\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (selectMatch) {
      const resolved = resolveFixtures(selectMatch[1]!, fixtures);
      currentScenario.steps.push({
        type: 'select',
        description: `Sélectionner "${resolved}"`,
        value: resolved,
        rawCode: trimmed,
      });
      continue;
    }

    // ── wait ──────────────────────────────────────────────────────────────
    if (trimmed.match(/\.waitFor|waitForURL|waitForLoadState/)) {
      currentScenario.steps.push({
        type: 'wait',
        description: 'Attendre le chargement',
        rawCode: trimmed,
      });
      continue;
    }

    // ── expect / assert ───────────────────────────────────────────────────
    if (trimmed.startsWith('expect(') || trimmed.match(/await expect/)) {
      const urlMatch = trimmed.match(/toHaveURL\s*\(\s*['"`]([^'"`]+)['"`]/);
      const textMatch = trimmed.match(/toHaveText\s*\(\s*['"`]([^'"`]+)['"`]/);
      const visibleMatch = trimmed.match(/toBeVisible|toBeEnabled|toBeDisabled|toBeChecked/);
      const containsMatch = trimmed.match(/toContainText\s*\(\s*['"`]([^'"`]+)['"`]/);
      const valueMatch = trimmed.match(/toHaveValue\s*\(\s*['"`]([^'"`]+)['"`]/);

      let desc = 'Vérification';
      let val: string | undefined;

      if (urlMatch) { desc = 'Vérifier l\'URL'; val = resolveFixtures(urlMatch[1]!, fixtures); }
      else if (textMatch) { desc = 'Vérifier le texte'; val = resolveFixtures(textMatch[1]!, fixtures); }
      else if (containsMatch) { desc = 'Contient le texte'; val = resolveFixtures(containsMatch[1]!, fixtures); }
      else if (valueMatch) { desc = 'Vérifier la valeur'; val = resolveFixtures(valueMatch[1]!, fixtures); }
      else if (visibleMatch) {
        const m = trimmed.match(/(toBeVisible|toBeEnabled|toBeDisabled|toBeChecked)/);
        desc = `Élément ${m?.[1] === 'toBeVisible' ? 'visible' : m?.[1] === 'toBeEnabled' ? 'activé' : m?.[1] === 'toBeDisabled' ? 'désactivé' : 'coché'}`;
      }

      currentScenario.steps.push({
        type: 'assert',
        description: desc,
        value: val,
        rawCode: trimmed,
      });
      continue;
    }
  }

  if (currentScenario && currentScenario.steps.length > 0) {
    scenarios.push(currentScenario);
  }

  return scenarios;
}
