# 🔧 TestForge

> **Transform user stories into professional automated tests — in seconds.**

[![CI](https://github.com/AlexThibaud1976/TestForge/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexThibaud1976/TestForge/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-9-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

---

## What is TestForge?

TestForge is a **B2B SaaS** that connects to your Jira or Azure DevOps backlog, scores the quality of your user stories, and generates production-ready **Playwright**, **Selenium**, and **Cypress** tests — with Page Object Model, externalized fixtures, and zero hardcoded selectors.

```
Jira / ADO  →  Quality Analysis  →  Manual Tests  →  Automated Tests  →  Push to Git / Xray / ADO Test Plans
```

The differentiator: **code quality**, not just generation speed. Every test follows your team's architecture from the start.

---

## Features

### 🔌 Integrations
- **Jira Cloud** — sync stories, sync by sprint/status/label, writeback improved stories, create Xray tests
- **Azure DevOps** — sync user stories via WIQL, create ADO Test Plans test cases, writeback
- **Git Push** — push generated tests to GitHub, GitLab, or Azure Repos as a PR or direct commit
- **Xray Cloud** — auto-create Xray tests linked to source stories, with AC-derived steps
- **ADO Test Plans** — create Test Cases with steps, attach to sprint Test Suite

### 📊 User Story Analysis
- Quality score **0–100** across 5 dimensions: Clarity, Completeness, Testability, Edge Cases, Acceptance Criteria
- Prioritized suggestions (Critical / Recommended / Optional)
- Automatic improved version with separate `improvedDescription` and `improvedAcceptanceCriteria`
- **Batch analysis** — analyze an entire sprint in one click, with a sortable scoreboard
- **Duplicate detection** — cosine similarity on LLM embeddings to flag similar stories
- **Change detection** — badge when a story changed since last generation, incremental re-generation
- Alert when score < 40 (too vague to generate useful tests)

### ⚙️ Test Generation
- **Playwright** — TypeScript, JavaScript, Python, Java, **C#**
- **Selenium v4** — Java, Python, **C#**, **Ruby**, **Kotlin**
- **Cypress** — JavaScript, TypeScript
- Every generation includes:
  - `pages/FeatureName.page.ts` — Page Object with `data-testid` locators
  - `tests/featureName.spec.ts` — happy path + at least 2 error cases
  - `fixtures/featureName.json` — all test data externalized
- **Syntactic validation** — TypeScript compiler checks generated code, auto-corrected via self-healing loop (max 2 LLM retries)
- **POM Registry** — shared Page Objects injected as context for future generations
- **Custom POM Templates** — team-defined base class injected into the generation prompt
- **Visual Test Preview** — parse spec.ts and render an interactive step timeline (no IDE needed)
- **Manual Tests** — generate, validate, and push structured manual test cases to Xray/ADO before generating automated tests (full traceability)

### 🤖 LLM Providers

| Provider | Models | Notes |
| --- | --- | --- |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini`, `o1` | Default, supports embeddings for duplicate detection |
| **Anthropic** | `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5` | Recommended for quality |
| **Azure OpenAI** | Any deployment | Data stays in your Azure tenant |
| **Mistral AI** | `mistral-large-latest`, `mistral-small-latest` | French sovereignty option |
| **Ollama** | Any local model | On-premise, no data leaves the network |

### 📋 Manual Tests (NEW)
Complete "Manual Test First" pipeline:
1. Generate structured manual test cases from AC (with priority, category, steps)
2. Edit inline in the UI
3. Validate the batch
4. Push to **Xray Cloud** or **ADO Test Plans**
5. Link to automated test generation — the LLM annotates the code with manual test IDs (`@XRAY-123`)

### 📊 Analytics & ROI
- Usage metrics (analyses, generations, manual tests per period)
- **Time saved** estimator with configurable coefficients
- Score trend by week (line chart)
- Framework and LLM provider distribution (donut charts)
- Satisfaction rate from **feedback** (thumbs up/down on generations)
- Negative feedback tags (wrong selector, missing import, etc.)

### 👥 Team & Billing
- Email/password auth with 14-day free trial (no credit card)
- Invite team members (Admin / Member roles)
- **Super Admin** backoffice — manage all teams, suspend/reactivate accounts
- **Starter** — €49/month · up to 5 members · OpenAI only
- **Pro** — €99/month · unlimited members · all LLM providers + integrations

### 🔍 Smart Import
- **Sprint filter** — sync only stories from the active sprint (dropdown from Jira board / ADO iterations)
- **Status filter** — e.g., only "Ready" and "In Progress"
- **Label filter** — e.g., `ready-for-qa`
- Local filters on the Stories page (client-side, no extra API call)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS v4 + Recharts |
| Backend | Node.js 20 + Express + TypeScript |
| ORM | Drizzle ORM |
| Database | Supabase PostgreSQL (EU region) |
| Auth | Supabase Auth (JWT + automatic token refresh) |
| LLM | OpenAI · Azure OpenAI · Anthropic · Mistral · Ollama |
| Embeddings | OpenAI `text-embedding-3-small` (duplicate detection) |
| Credentials | AES-256-GCM encryption |
| Payments | Stripe Checkout + Webhooks |
| Tests | Vitest (229 unit tests, 85%+ line coverage) |
| Deploy | Railway (backend) + Vercel (frontend) |
| CI/CD | GitHub Actions |
| Monorepo | pnpm workspaces |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.0.0 (`npm install -g pnpm`)
- A **Supabase** project (free tier works) — [supabase.com](https://supabase.com)
- An **LLM API key** — OpenAI, Anthropic, Azure OpenAI, or Mistral

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

# Generate and apply database migrations
pnpm --filter backend db:generate
pnpm --filter backend db:migrate

# Start both frontend and backend
pnpm --filter backend dev   # port 3099
pnpm --filter frontend dev  # port 5173
```

Open **http://localhost:5173** and create your team account.

> **Note:** The first Super Admin must be seeded manually:
> ```bash
> SUPER_ADMIN_SEED_USER_ID=<your-supabase-user-id> pnpm --filter backend tsx scripts/seed-super-admin.ts
> ```

### Environment Variables

**Backend** (`apps/backend/.env`):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL direct connection string (Supabase → Settings → Database) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (keep secret) |
| `ENCRYPTION_KEY` | 64-char hex key — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional — required for billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | Stripe price ID for the Starter plan |
| `STRIPE_PRICE_PRO` | Stripe price ID for the Pro plan |
| `PORT` | Backend port (default: `3099`) |
| `FRONTEND_URL` | Frontend URL for CORS |

**Frontend** (`apps/frontend/.env`):

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (e.g. `http://localhost:3099`) |

---

## Usage

### 1. Connect your backlog

Go to **🔌 Connections** and add your Jira or Azure DevOps credentials. Optionally configure:
- Xray credentials (for auto-creating Xray tests)
- The Acceptance Criteria custom field ID (e.g. `customfield_10020`) for precise writebacks
- Git repos for pushing generated tests

### 2. Sync with smart filters

Click **↻ Sync** — a dialog lets you filter by sprint, statuses, and labels. Only relevant stories are imported.

### 3. Analyze (individually or in batch)

- Open a story → **Analyze** — score + suggestions + improved version in ~8 seconds
- From the Stories page → **📊 Analyser le sprint** — batch analysis with sortable scoreboard and CSV export

### 4. Manual Tests (optional but recommended)

In the **📋 Tests manuels** tab:
1. **Générer** — LLM creates structured test cases from AC
2. **Valider** — mark the batch as approved
3. **Pousser** → Xray Cloud or ADO Test Plans

### 5. Generate and ship automated tests

Switch to **⚙️ Génération**, choose your framework and language, and click **Generate**. Options:
- Link to validated manual tests (IDs injected as annotations in the code)
- Use the improved story version
- The code is syntactically validated and auto-corrected if needed

Actions on the generated code:
- **↑ Push to Git** — as PR or direct commit
- **🔗 Create Xray Test** — linked to the source story
- **📋 Create ADO Test Case** — attached to the sprint suite
- **🔍 Preview** — visual step timeline, no IDE needed
- **👍/👎 Feedback** — helps measure team satisfaction

---

## Project Structure

```
testforge/
├── apps/
│   ├── backend/                  # Express API
│   │   └── src/
│   │       ├── routes/           # REST endpoints
│   │       ├── services/
│   │       │   ├── llm/          # LLMClient + 5 adapters (OpenAI, Azure, Anthropic, Mistral, Ollama)
│   │       │   ├── analysis/     # AnalysisService + BatchAnalysisService + prompts
│   │       │   ├── generation/   # GenerationService (12 framework combos) + CodeValidator + PomRegistry
│   │       │   ├── manual-tests/ # ManualTestService + push to Xray/ADO
│   │       │   ├── connectors/   # JiraConnector + ADOConnector (with SyncFilters)
│   │       │   ├── git/          # GitPushService + GitHub/GitLab/AzureRepos adapters
│   │       │   ├── xray/         # XrayConnector (Cloud v2)
│   │       │   ├── writeback/    # WritebackService
│   │       │   ├── analytics/    # AnalyticsService (metrics + ROI)
│   │       │   └── duplicates/   # DuplicateDetectionService (cosine similarity)
│   │       ├── db/               # Drizzle schema + migrations
│   │       ├── middleware/       # Auth + suspension check + super admin
│   │       └── utils/            # Encryption, storyHash, diffAC
│   └── frontend/                 # React SPA
│       └── src/
│           ├── pages/            # Stories, StoryDetail, Analytics, PomRegistry, SuperAdmin, ...
│           ├── components/       # SprintScoreboard, FeedbackWidget, TestPreview, DuplicatesPanel, ...
│           ├── lib/              # api.ts (with retry + token refresh), testPreviewParser.ts
│           └── hooks/            # Auth, Realtime
├── packages/
│   └── shared-types/             # Shared TypeScript interfaces
└── specs/                        # Feature specifications (spec-kit format)
    ├── 001-testforge-v2/
    ├── 003-batch-analysis/
    ├── 004-code-validation/
    └── ...
```

---

## Architecture Principles

- **LLM abstraction** — All LLM calls go through `LLMClient`. Adding a provider = one adapter file.
- **Multi-tenant** — Every DB query is scoped by `team_id`. No cross-team data leakage.
- **Realtime** — Generation is async; Supabase Realtime pushes results to the frontend.
- **No credentials in plaintext** — Jira tokens, ADO PATs, LLM keys, Git PATs, and Xray secrets are all AES-256-GCM encrypted.
- **Dynamic route loading** — V2 routes are loaded with `await import()` to isolate ESM/CJS issues (e.g., `azure-devops-node-api`).
- **API resilience** — The frontend `api.ts` auto-refreshes expired JWT tokens on 401 and retries on network errors.

---

## Deployment

| Service | Platform | Trigger |
| --- | --- | --- |
| Backend | Railway | Auto-deploy on push to `main` |
| Frontend | Vercel | Auto-deploy on push to `main` |

The GitHub Actions CI pipeline runs **build → typecheck → tests (with coverage)** on every push to `main`.

**Required GitHub Secrets for CI:**

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
DATABASE_URL
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL
ENCRYPTION_KEY
```

---

## Roadmap

### ✅ V1 — MVP
Core pipeline: connect → analyze → generate → download.

### ✅ V2 — Integrations & Intelligence
- Push to Git (GitHub, GitLab, Azure Repos)
- Xray Cloud + ADO Test Plans integration
- Writeback improved stories to Jira/ADO
- Playwright C#, Selenium C#/Ruby/Kotlin, Cypress JS/TS
- Mistral AI + Ollama (on-premise)
- Manual Test First pipeline with traceability
- POM Registry (shared Page Objects across generations)
- Syntactic validation with self-healing loop
- Analytics & ROI dashboard
- Batch analysis with sprint scoreboard
- Duplicate detection
- Smart import filters (sprint, status, labels)
- Visual test preview (no-IDE step timeline)
- Feedback widget (thumbs up/down + negative tags)
- Incremental regeneration when a story changes
- Super Admin backoffice

### 🔜 V3 — Jira Addon
Lightweight Jira panel — display quality score directly inside Jira issues, deep-link to TestForge for generation. Distribution via Atlassian Marketplace.

### 🔜 V4 — Azure DevOps Extension
If V3 traction confirms demand.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git checkout -b feat/my-feature
# make changes
pnpm --filter backend test && pnpm --filter backend typecheck
pnpm --filter frontend typecheck
git commit -m "feat: my feature"
git push origin feat/my-feature
# open a PR against main
```

**Commit convention:** `feat:`, `fix:`, `chore:`, `test:`, `docs:`

---

## License

[MIT](LICENSE) © 2026 Alexandre Thibaud
