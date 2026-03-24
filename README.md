# 🔧 TestForge

> **Transform user stories into professional automated tests — in seconds.**

[![CI](https://github.com/AlexThibaud1976/TestForge/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexThibaud1976/TestForge/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-9-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

---

## What is TestForge?

TestForge is a **B2B SaaS** that connects to your Jira or Azure DevOps backlog, scores the quality of your user stories, and generates production-ready **Playwright** and **Selenium** tests in seconds — with Page Object Model, externalized fixtures, and zero hardcoded selectors.

```
User Story (Jira / ADO)  →  Quality Analysis (score + suggestions)  →  Generate Tests  →  Download ZIP
```

The differentiator: **code quality**, not just generation speed. Every test follows your team's architecture from the start.

---

## Features

### 🔌 Integrations
- **Jira Cloud** — connect via API token, browse sprints and backlogs
- **Azure DevOps** — connect via Personal Access Token, query work items

### 📊 User Story Analysis
- Quality score **0–100** across 5 dimensions: Clarity, Completeness, Testability, Edge Cases, Acceptance Criteria
- Prioritized suggestions (Critical / Recommended / Optional)
- Automatic improved version of the story — ready to copy back into Jira
- Alert when score < 40 (too vague to generate useful tests)

### ⚙️ Test Generation
- **Playwright** — TypeScript, JavaScript, Python, Java
- **Selenium v4** — Java, Python
- Every generation includes:
  - `pages/FeatureName.page.ts` — Page Object with `data-testid` locators
  - `tests/featureName.spec.ts` — happy path + at least 2 error cases
  - `fixtures/featureName.json` — all test data externalized
- Download as ZIP, structured for instant use in your repo

### 👥 Team & Billing
- Email/password auth with 14-day free trial (no credit card)
- Invite team members (Admin / Member roles)
- **Starter** — €49/month · up to 5 members · OpenAI only
- **Pro** — €99/month · unlimited members · all LLM providers

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Drizzle ORM |
| Database | Supabase PostgreSQL (EU region) |
| Auth | Supabase Auth (JWT) |
| LLM | OpenAI · Azure OpenAI · Anthropic Claude |
| Credentials | AES-256-GCM encryption |
| Payments | Stripe Checkout + Webhooks |
| Tests | Vitest (47 unit tests, 95%+ service coverage) |
| Deploy | Railway (backend) + Vercel (frontend) |
| CI/CD | GitHub Actions |
| Monorepo | pnpm workspaces |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0 (`npm install -g pnpm`)
- A **Supabase** project (free tier works) — [supabase.com](https://supabase.com)
- An **LLM API key** — OpenAI, Anthropic, or Azure OpenAI

### Installation

```bash
# Clone the repository
git clone https://github.com/AlexThibaud1976/TestForge.git
cd TestForge

# Install all workspace dependencies
pnpm install

# Configure environment
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env
# → Fill in the required values (see Environment Variables below)

# Run database migrations
cd apps/backend && pnpm db:migrate && cd ../..

# Start both frontend and backend
pnpm dev
```

Open **http://localhost:5173** and create your team account.

### Environment Variables

**Backend** (`apps/backend/.env`):

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (keep secret) |
| `DATABASE_URL` | PostgreSQL direct connection string (from Supabase → Settings → Database) |
| `ENCRYPTION_KEY` | 64-char hex key — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional — required for billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | Stripe price ID for the Starter plan |
| `STRIPE_PRICE_PRO` | Stripe price ID for the Pro plan |
| `PORT` | Backend port (default: `3000`) |
| `FRONTEND_URL` | Frontend URL for CORS (default: `http://localhost:5173`) |

**Frontend** (`apps/frontend/.env`):

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (default: `http://localhost:3000`) |

See [`.env.example`](.env.example) for a full reference.

---

## Usage

### 1. Connect your project management tool

Go to **🔌 Connections** and add your Jira or Azure DevOps credentials. TestForge encrypts all credentials at rest.

### 2. Sync and analyze user stories

Click **↻ Sync** to import stories from your backlog. Open any story and click **Analyze** — you'll get a quality score and improvement suggestions in ~8 seconds.

### 3. Generate and download tests

Switch to the **⚙️ Generation** tab, choose your framework and language, then click **Generate**. The tests appear with syntax highlighting. Download as a ZIP, drop it into your repo — done.

---

## LLM Providers

| Provider | Supported Models | Notes |
| --- | --- | --- |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | Default |
| **Anthropic** | `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5` | Recommended for quality |
| **Azure OpenAI** | Any deployment name | Data stays in your Azure tenant |

The active provider is configured **per team** by an Admin. All API keys are encrypted with AES-256.

---

## Test Generation — What You Get

For each user story, TestForge generates **3 files**:

```
pages/
  └── FeatureName.page.ts      # Page Object — locators & actions
tests/
  └── featureName.spec.ts      # Test suite — happy path + error cases
fixtures/
  └── featureName.json         # Test data — never hardcoded
```

**Supported frameworks:**

| Framework | Languages |
| --- | --- |
| Playwright | TypeScript, JavaScript, Python, Java |
| Selenium v4 | Java, Python |

> C# (Playwright + Selenium), Ruby, and Kotlin coming in V2.

---

## Development

### Available Commands

```bash
# From the root (runs both apps)
pnpm dev                          # Start dev servers
pnpm test                         # Run all tests
pnpm typecheck                    # TypeScript check (all packages)
pnpm lint                         # ESLint
pnpm format                       # Prettier

# Backend only
cd apps/backend
pnpm test:watch                   # Vitest in watch mode
pnpm test:coverage                # Coverage report
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Apply migrations
pnpm db:studio                    # Drizzle Studio GUI
```

### Project Structure

```
testforge/
├── apps/
│   ├── backend/                  # Express API
│   │   └── src/
│   │       ├── routes/           # REST endpoints
│   │       ├── services/         # Business logic
│   │       │   ├── llm/          # LLMClient + 3 adapters
│   │       │   ├── analysis/     # AnalysisService + prompts
│   │       │   ├── generation/   # GenerationService + prompts
│   │       │   └── connectors/   # Jira + ADO connectors
│   │       ├── db/               # Drizzle schema + migrations
│   │       ├── middleware/       # Auth + plan enforcement
│   │       └── utils/            # Encryption
│   └── frontend/                 # React SPA
│       └── src/
│           ├── pages/            # Page components
│           ├── components/       # Reusable UI
│           ├── hooks/            # Custom hooks (auth, realtime)
│           └── lib/              # API client, Supabase
└── packages/
    └── shared-types/             # Shared TypeScript interfaces
```

### Architecture Principles

- **LLM abstraction**: All LLM calls go through the `LLMClient` interface — never directly to OpenAI/Anthropic. Adding a new provider = one adapter file + one line in the registry.
- **Multi-tenant**: Every DB query is scoped by `team_id`. No cross-team data leakage.
- **Realtime**: Generation is async — the backend processes in the background and Supabase Realtime pushes the result to the frontend.
- **No credentials in plaintext**: Jira tokens, ADO PATs, and LLM API keys are encrypted with AES-256-GCM before storage.

---

## Deployment

TestForge is designed for zero-config deployment via GitHub integrations:

| Service | Platform | Trigger |
| --- | --- | --- |
| Backend | Railway | Auto-deploy on push to `main` |
| Frontend | Vercel | Auto-deploy on push to `main` |

The GitHub Actions CI pipeline runs lint + typecheck + tests on every PR and push to `main`.

**Required GitHub Secrets for CI/CD:**

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
ENCRYPTION_KEY          (for test runs)
```

---

## Roadmap

### V2
- [ ] Push generated tests to GitHub / GitLab / Azure Repos as a PR
- [ ] Xray (Jira) integration — auto-create linked test cases
- [ ] Azure DevOps Test Plans integration
- [ ] Playwright C#, Selenium C# / Ruby / Kotlin
- [ ] Mistral + Ollama (on-premise) LLM support
- [ ] Team analytics (average US score, time saved)

### V3
- [ ] Lightweight Jira addon — display quality score directly inside Jira issues, deep-link to TestForge for generation
- [ ] Azure DevOps extension (if V3 traction confirms demand)

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feat/my-feature
# make changes
pnpm test && pnpm typecheck
git commit -m "feat: my feature"
git push origin feat/my-feature
# open a PR against main
```

**Commit convention:** `feat:`, `fix:`, `chore:`, `test:`, `docs:`

---

## License

[MIT](LICENSE) © 2026 Alexandre Thibaud
