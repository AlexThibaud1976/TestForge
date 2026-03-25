# TestForge Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-25

## Active Technologies

- TypeScript strict 5.x + React 18 + Vite, Node.js 20 + Express, Drizzle ORM (001-testforge-v2)
- PostgreSQL via Supabase (001-testforge-v2)

## Project Structure

```text
apps/backend/
apps/frontend/
packages/shared-types/
specs/
tests/
```

## Commands

```bash
pnpm --filter backend dev     # backend dev server (port 3099)
pnpm --filter frontend dev    # frontend dev server (port 5173)
pnpm --filter backend test    # run Vitest tests
pnpm --filter backend lint    # ESLint check
pnpm --filter backend typecheck  # TypeScript strict check
```

## Code Style

TypeScript strict: Follow standard conventions. No implicit `any`. Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`). Prettier enforced.

## Recent Changes

- 001-testforge-v2: Added TypeScript strict 5.x + React 18 + Vite, Node.js 20 + Express, Drizzle ORM

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
