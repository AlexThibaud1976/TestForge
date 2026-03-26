# CLAUDE_TASK — Intégration du User Guide

> Intégrer la page de documentation UserGuideDocs.tsx dans l'application TestForge.
> Le fichier `apps/frontend/src/pages/UserGuideDocs.tsx` est déjà en place.
> Usage : `claude < claude_task_userguide.md`

---

## Contexte

TestForge — monorepo pnpm. Frontend React 18 + Vite + TypeScript strict + shadcn/ui + Tailwind.
Le fichier `apps/frontend/src/pages/UserGuideDocs.tsx` contient un composant React multi-pages (style Stripe Docs) avec sidebar, recherche, mockups SVG inline, et micro-animations.

Le guide doit être **public** (accessible sans login) — un prospect peut le lire avant de s'inscrire.

## Règles

- TypeScript strict, aucun `any` implicite
- Ne PAS modifier le contenu du guide (textes, mockups, structure des pages)
- Ajouter uniquement le typage TS et l'intégration dans le routing
- Conventional Commits

---

## Tâche 1 — Fixer le typage TypeScript

Le fichier `UserGuideDocs.tsx` a été écrit en JSX. Il faut ajouter le typage pour passer `pnpm --filter frontend typecheck`.

Ouvrir `apps/frontend/src/pages/UserGuideDocs.tsx` et appliquer les corrections suivantes :

### 1.1 — Typer les composants utilitaires

Trouver le composant `FadeIn` et ajouter le typage des props :

```typescript
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
```

Trouver `Tip` et typer :

```typescript
function Tip({ type = "tip", children }: { type?: "tip" | "warning" | "info" | "pro"; children: React.ReactNode }) {
```

Trouver `Step` et typer :

```typescript
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
```

Trouver `MockupFrame` et typer :

```typescript
function MockupFrame({ title, children }: { title: string; children: React.ReactNode }) {
```

Trouver `Badge` et typer :

```typescript
function Badge({ color = "blue", children }: { color?: "blue" | "green" | "orange" | "red" | "purple" | "gray"; children: React.ReactNode }) {
```

Trouver `ScoreBar` et typer :

```typescript
function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
```

Trouver `Section` (si présent) et typer de la même manière.

### 1.2 — Typer les event handlers

Chercher tous les `onMouseEnter` et `onMouseLeave` avec `e.currentTarget.style` et typer le paramètre :

```typescript
onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { ... }}
onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { ... }}
```

Chercher les `onFocus` et `onBlur` sur les inputs :

```typescript
onFocus={(e: React.FocusEvent<HTMLInputElement>) => ...}
onBlur={(e: React.FocusEvent<HTMLInputElement>) => ...}
```

### 1.3 — Typer window.__setPage

Le guide utilise `window.__setPage` pour la navigation inter-pages. Ajouter la déclaration de type en haut du fichier, après les imports :

```typescript
declare global {
  interface Window {
    __setPage?: (page: string) => void;
  }
}
```

### 1.4 — Ajouter l'export nommé

Le fichier a un `export default`. Ajouter aussi un export nommé pour la cohérence avec les autres pages du projet :

```typescript
export { UserGuideDocs };
export default function UserGuideDocs() {
```

Ou si le fichier utilise déjà `export default function UserGuideDocs`, ajouter en fin de fichier :

```typescript
export { UserGuideDocs };
```

### 1.5 — Vérifier

```bash
pnpm --filter frontend typecheck
```

Corriger toutes les erreurs TS restantes. Les plus courantes seront :
- `Parameter implicitly has an 'any' type` → ajouter le type
- `Property does not exist on type 'Window'` → résolu par le declare global ci-dessus
- `Object is possibly 'undefined'` → ajouter des optional chaining `?.`

---

## Tâche 2 — Ajouter la route dans App.tsx

Ouvrir `apps/frontend/src/App.tsx`.

### 2.1 — Ajouter l'import

Ajouter avec les autres imports de pages, au même endroit :

```typescript
import { UserGuideDocs } from './pages/UserGuideDocs.js';
```

Si l'export nommé n'existe pas, utiliser :

```typescript
import UserGuideDocs from './pages/UserGuideDocs.js';
```

### 2.2 — Ajouter la route publique

Dans le `return` du composant `App`, ajouter la route `/docs` **AVANT** le catch-all `path="*"` et **AU MÊME NIVEAU** que les routes publiques (`/`, `/login`, `/register`).

Le résultat doit ressembler à :

```tsx
return (
  <Routes>
    <Route path="/" element={session ? <Navigate to="/stories" replace /> : <LandingPage />} />
    <Route path="/login" element={session ? <Navigate to="/stories" replace /> : <LoginPage />} />
    <Route path="/register" element={session ? <Navigate to="/stories" replace /> : <RegisterPage />} />
    <Route path="/invite/:token" element={<InvitePage />} />
    <Route path="/docs" element={<UserGuideDocs />} />
    <Route path="*" element={session ? <ProtectedRoutes /> : <Navigate to="/" replace />} />
  </Routes>
);
```

IMPORTANT : la route `/docs` ne doit PAS être dans `ProtectedRoutes` — elle doit être accessible sans authentification.

---

## Tâche 3 — Ajouter le lien dans la LandingPage

Ouvrir `apps/frontend/src/pages/LandingPage.tsx`.

### 3.1 — Lien dans la navbar

Trouver la section `<nav>` (le header sticky en haut). Ajouter un lien "Documentation" AVANT le bouton "Se connecter" :

```tsx
<Link
  to="/docs"
  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
>
  Documentation
</Link>
```

Vérifier que `Link` est déjà importé depuis `react-router-dom` (il l'est — la LandingPage l'utilise déjà).

### 3.2 — Lien dans le footer

Trouver la section `<footer>`. Ajouter un lien "Documentation" dans le groupe de liens existant :

```tsx
<Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
```

---

## Tâche 4 — Ajouter le lien dans l'AppLayout (app connectée)

Ouvrir `apps/frontend/src/components/layout/AppLayout.tsx`.

Trouver le menu de navigation latéral ou le header. Ajouter un lien vers la documentation en bas du menu ou dans le header, avec `target="_blank"` pour ouvrir dans un nouvel onglet (ne pas quitter l'app) :

```tsx
<a
  href="/docs"
  target="_blank"
  rel="noreferrer"
  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 px-3 py-2"
>
  <span className="text-base">📖</span>
  Documentation
</a>
```

Le placer idéalement :
- En bas du menu latéral (avant le footer du sidebar), OU
- Dans le header à côté du nom de l'utilisateur, OU
- Dans un groupe "Aide" s'il existe

Adapter le style (classes Tailwind) pour être cohérent avec les autres liens du menu.

---

## Tâche 5 — Vérification finale

```bash
# TypeScript strict — aucune erreur
pnpm --filter frontend typecheck

# Lint — aucune erreur
pnpm --filter frontend lint 2>/dev/null || pnpm lint

# Dev server — vérifier visuellement
pnpm --filter frontend dev
```

Vérifications manuelles à faire dans le navigateur :
1. Ouvrir `http://localhost:5173/docs` → le guide s'affiche avec la sidebar et le moteur de recherche
2. Naviguer entre les pages → chaque article se charge, les mockups SVG s'affichent
3. Taper "xray" dans la recherche → les résultats pertinents apparaissent
4. Ouvrir `http://localhost:5173/` → le lien "Documentation" est visible dans la nav
5. Se connecter → le lien "Documentation" est visible dans le menu latéral de l'app
6. Cliquer sur "Documentation" depuis l'app → s'ouvre dans un nouvel onglet

```bash
git add apps/frontend/src/pages/UserGuideDocs.tsx apps/frontend/src/App.tsx apps/frontend/src/pages/LandingPage.tsx apps/frontend/src/components/layout/AppLayout.tsx
git commit -m "feat: integrate user guide docs at /docs with search and mockups"
```
