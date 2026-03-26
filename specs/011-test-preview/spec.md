# Feature Specification: Visual Test Preview

**Feature Branch**: `011-test-preview`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Afficher un "dry-run visuel" du test généré : une timeline des étapes avec les actions (navigate, fill, click, assert) sous forme de schéma séquencé. Le QA valide la logique du test sans ouvrir son IDE.

### Problème

Le code généré est affiché en coloration syntaxique — il faut lire du TypeScript pour comprendre ce que le test fait. Les PO et QA moins techniques ne peuvent pas valider la logique sans l'aide d'un dev.

### Solution

Parser le code `*.spec.ts` pour en extraire les actions Playwright (goto, fill, click, expect) et les afficher comme une timeline visuelle. Pas d'exécution réelle — juste un parsing statique du code.

---

## User Stories

### US-TP-1 — Timeline visuelle du test (Priority: P1)

Sarah génère des tests. Avant de télécharger, elle clique "Prévisualiser" et voit une timeline des étapes du test avec les actions et les assertions.

**Acceptance Scenarios**:

1. **Given** un test généré avec 5 actions, **When** Sarah clique "Prévisualiser", **Then** une timeline verticale affiche les 5 étapes avec : icône d'action (naviguer, remplir, cliquer, vérifier), description, et valeur (URL, texte, sélecteur).
2. **Given** un test avec un happy path et 2 cas d'erreur, **Then** la preview montre les 3 scénarios séparés avec un titre pour chaque.
3. **Given** un test avec des données de fixtures, **Then** les valeurs affichées dans la preview sont les vraies valeurs des fixtures (pas les noms de variables).

---

### US-TP-2 — Preview partageable (Priority: P3)

La preview peut être exportée en image PNG ou partagée via un lien (pour un PO qui n'a pas accès à TestForge).

---

## Requirements

- **FR-TP-001**: Le système DOIT parser le code spec.ts pour extraire les actions Playwright.
- **FR-TP-002**: Les actions supportées sont : `page.goto()`, `page.fill()`, `page.click()`, `page.getByRole()`, `page.getByTestId()`, `expect().toBeVisible()`, `expect().toHaveText()`, `expect().toHaveURL()`.
- **FR-TP-003**: La preview DOIT être un composant React rendu côté frontend (pas de backend).
- **FR-TP-004**: Les fixtures DOIVENT être résolues : si le code référence `fixtures.email`, la preview affiche la valeur depuis le fichier fixtures.json.
- **FR-TP-005**: Chaque `test()` bloc DOIT être un scénario séparé dans la preview.
- **Plan**: disponible sur Starter et Pro.

---

# Implementation Plan

## Architecture

Tout est côté frontend — pas de nouveau endpoint backend. Le parsing du code se fait en JavaScript dans le navigateur.

### TestPreviewParser (frontend utility)

```typescript
interface PreviewStep {
  type: 'navigate' | 'fill' | 'click' | 'select' | 'assert' | 'wait' | 'other';
  description: string;        // "Navigate to /login"
  target?: string;            // "page.getByTestId('email-input')"
  value?: string;             // "user@example.com"
  rawCode: string;            // ligne de code originale
}

interface PreviewScenario {
  name: string;               // nom du test()
  steps: PreviewStep[];
}

function parseTestSpec(specCode: string, fixturesJson?: string): PreviewScenario[]
```

Le parser utilise des regex sur les patterns Playwright :
- `page.goto('...')` → type: navigate, value: URL
- `page.fill('...', '...')` ou `page.getByTestId('...').fill('...')` → type: fill
- `page.click('...')` ou `*.click()` → type: click
- `expect(...).*` → type: assert
- `test('...', async` → nouveau scénario

### Résolution des fixtures

Si le code contient `fixtures.email` et que le fichier fixtures.json est disponible, résoudre la valeur. Parser le JSON, remplacer `fixtures.xxx` par la valeur réelle dans la description du step.

---

## Estimation

| Phase | Effort |
|---|---|
| Phase 1 — Parser frontend | ~4h |
| Phase 2 — Composant timeline visuelle | ~5h |
| **Total** | **~9h** |

---

# Tasks

## Phase 1: Parser (~4h)

- [ ] T001 [P] Créer `apps/frontend/src/lib/testPreviewParser.ts` :
  - `parseTestSpec(specCode, fixturesJson?)` → PreviewScenario[]
  - Regex pour chaque type d'action Playwright
  - Résolution des valeurs fixtures
- [ ] T002 Tests unitaires du parser (Vitest côté frontend) :
  - Code avec goto + fill + click + expect → 4 steps corrects
  - Code avec 2 test() blocs → 2 scénarios
  - Code avec fixtures.email → valeur résolue depuis le JSON
  - Code non-Playwright (import, variable) → ignoré (pas de step)

## Phase 2: Composant Timeline (~5h)

- [ ] T003 [P] Créer `apps/frontend/src/components/TestPreview.tsx` :
  - Timeline verticale avec des nœuds connectés par une ligne
  - Chaque nœud : icône (lucide-react: Globe pour navigate, Type pour fill, MousePointer pour click, CheckCircle pour assert), description, valeur en gris
  - Séparation par scénario (titre du test en header)
  - Utiliser shadcn/ui Card pour chaque scénario
- [ ] T004 Bouton "Prévisualiser" dans l'onglet Génération de StoryDetailPage — ouvre un panel/drawer avec le TestPreview
- [ ] T005 Gérer le cas "aucune action parseable" → message "Preview non disponible pour ce code"

---

# CLAUDE_TASK

Points clés :
- 100% frontend — pas de backend, pas de table
- Parser regex sur les patterns Playwright connus
- Résolution des fixtures.xxx → valeurs réelles
- Timeline verticale avec icônes lucide-react
- Commit : `feat: 011-test-preview — visual dry-run of generated tests`
