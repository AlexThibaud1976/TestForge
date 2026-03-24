# Plan Technique — TestForge v1.0

> Architecture et stratégie d'implémentation — Mars 2026
> Voir spec.md pour les user stories et les features détaillées.

---

## 1. Architecture

### Vue d'ensemble

Architecture client-serveur classique avec séparation claire frontend / API backend. Pas de fullstack framework (Next.js) — on sépare délibérément le frontend React du backend Express pour simplifier le déploiement et éviter la magie implicite.

Le backend est le seul à avoir accès aux APIs LLM et aux credentials chiffrés. Le frontend ne contacte jamais directement OpenAI, Azure ou Anthropic.

```
[Browser: React + Vite]
         │ HTTPS (JSON REST)
         ▼
[Backend: Node.js + Express]
    │              │              │
    ▼              ▼              ▼
[Supabase]   [LLM Clients]  [Jira/ADO APIs]
(PostgreSQL)  OpenAI / Azure /
              Anthropic
```

### Stack technique

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | React 18 + Vite + TypeScript | Familier, léger, rapide au build |
| UI Components | shadcn/ui + Tailwind CSS | Composants accessibles, pas de surcharge |
| Syntax highlight | Prism.js ou Shiki | Coloration du code généré |
| Backend | Node.js 20 + Express + TypeScript | Zone de confort, simple, bien documenté |
| ORM | Drizzle ORM | TypeScript natif, migrations propres, léger |
| Base de données | Supabase (PostgreSQL) | Managed, EU region, auth intégrée |
| Auth | Supabase Auth | Email/password + JWT, simple à intégrer |
| Paiement | Stripe Checkout + Webhooks | Standard industrie |
| Chiffrement | Node.js `crypto` (AES-256-GCM) | Built-in, pas de dépendance externe |
| Tests | Vitest (unit) + Supertest (API) | Vitest rapide, Supertest pour les routes |
| Déploiement backend | Railway | Simple, EU region, pas de config K8s |
| Déploiement frontend | Vercel | CDN global, preview par PR |
| CI/CD | GitHub Actions | Gratuit, intégré au repo |
| Monitoring | Sentry (erreurs) | Free tier suffisant au départ |

### Diagramme de flux de données — Génération de tests

```
[Browser]
   │ POST /api/generations {analysisId, usedImprovedVersion}
   ▼
[Express Route: /api/generations]
   │ Récupère analysis + userStory depuis Supabase
   │ Récupère LLMConfig de l'équipe (provider, clé déchiffrée)
   ▼
[GenerationService]
   │ Construit le prompt (template versionné)
   ▼
[LLMClient.generate(prompt)] ← Interface abstraite
   │
   ├─► [OpenAIAdapter]     → api.openai.com
   ├─► [AzureOpenAIAdapter] → *.openai.azure.com
   └─► [AnthropicAdapter]  → api.anthropic.com
   │
   ▼
[GenerationService]
   │ Parse la réponse JSON (fichiers générés)
   │ Stocke en Supabase (table generations + generated_files)
   ▼
[Browser] ← Reçoit {generationId, files: [...]}
```

---

## 2. Schéma de Base de Données

### Tables

```sql
-- Équipes
teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'starter' | 'pro'
  trial_ends_at   TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Membres de l'équipe (lien users Supabase Auth ↔ teams)
team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,              -- Supabase Auth user ID
  role            TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  invited_by      UUID,
  joined_at       TIMESTAMPTZ DEFAULT now()
);

-- Connexions sources (Jira / ADO)
source_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID REFERENCES teams(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,        -- 'jira' | 'azure_devops'
  name                  TEXT NOT NULL,        -- Nom affiché
  base_url              TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,        -- AES-256-GCM chiffré
  project_key           TEXT NOT NULL,
  is_active             BOOLEAN DEFAULT true,
  last_sync_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Configurations LLM par équipe
llm_configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID REFERENCES teams(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,          -- 'openai' | 'azure_openai' | 'anthropic'
  model               TEXT NOT NULL,          -- 'gpt-4o' | 'claude-3-5-sonnet-20241022' | etc.
  encrypted_api_key   TEXT NOT NULL,
  azure_endpoint      TEXT,                   -- Azure uniquement
  azure_deployment    TEXT,                   -- Azure uniquement
  is_default          BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT one_default_per_team UNIQUE (team_id, is_default)
    DEFERRABLE INITIALLY DEFERRED
);

-- User stories importées
user_stories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID REFERENCES teams(id) ON DELETE CASCADE,
  connection_id       UUID REFERENCES source_connections(id),
  external_id         TEXT NOT NULL,          -- ID Jira/ADO
  title               TEXT NOT NULL,
  description         TEXT,
  acceptance_criteria TEXT,
  labels              TEXT[] DEFAULT '{}',
  status              TEXT,
  fetched_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (connection_id, external_id)
);

-- Analyses qualité
analyses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id           UUID REFERENCES user_stories(id),
  team_id                 UUID REFERENCES teams(id),
  score_global            SMALLINT NOT NULL,
  score_clarity           SMALLINT NOT NULL,
  score_completeness      SMALLINT NOT NULL,
  score_testability       SMALLINT NOT NULL,
  score_edge_cases        SMALLINT NOT NULL,
  score_acceptance_criteria SMALLINT NOT NULL,
  suggestions             JSONB NOT NULL DEFAULT '[]',
  improved_version        TEXT,
  llm_provider            TEXT NOT NULL,
  llm_model               TEXT NOT NULL,
  prompt_version          TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- Générations de tests
generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID REFERENCES analyses(id),
  team_id         UUID REFERENCES teams(id),
  framework       TEXT NOT NULL DEFAULT 'playwright',
  language        TEXT NOT NULL DEFAULT 'typescript',
  used_improved_version BOOLEAN DEFAULT false,
  llm_provider    TEXT NOT NULL,
  llm_model       TEXT NOT NULL,
  prompt_version  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'success' | 'error'
  error_message   TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Fichiers générés (liés à une génération)
generated_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id   UUID REFERENCES generations(id) ON DELETE CASCADE,
  file_type       TEXT NOT NULL, -- 'page_object' | 'test_spec' | 'fixtures'
  filename        TEXT NOT NULL, -- 'pages/Login.page.ts'
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Invitations en attente
invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID REFERENCES teams(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### Relations clés

- `teams` 1 → N `team_members`
- `teams` 1 → N `source_connections`
- `teams` 1 → N `llm_configs` (1 seul `is_default = true` par équipe)
- `source_connections` 1 → N `user_stories`
- `user_stories` 1 → N `analyses`
- `analyses` 1 → N `generations`
- `generations` 1 → N `generated_files`

---

## 3. API Design

### Auth (Supabase Auth gère l'essentiel)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/auth/register` | Créer compte + équipe | ❌ |
| POST | `/api/auth/invite/accept` | Accepter une invitation | ❌ (token) |

### Teams & Members

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/teams/me` | Récupérer l'équipe de l'utilisateur | ✅ |
| PUT | `/api/teams/me` | Modifier le nom de l'équipe | ✅ Admin |
| GET | `/api/teams/me/members` | Lister les membres | ✅ |
| POST | `/api/teams/me/invitations` | Inviter un membre | ✅ Admin |
| DELETE | `/api/teams/me/members/:userId` | Retirer un membre | ✅ Admin |

### Connexions sources

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/connections` | Lister les connexions | ✅ |
| POST | `/api/connections` | Créer une connexion | ✅ Admin |
| POST | `/api/connections/:id/test` | Tester la connexion | ✅ Admin |
| DELETE | `/api/connections/:id` | Supprimer | ✅ Admin |

### LLM Config

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/llm-configs` | Lister les configs | ✅ |
| POST | `/api/llm-configs` | Créer une config | ✅ Admin |
| POST | `/api/llm-configs/:id/test` | Tester la connexion LLM | ✅ Admin |
| PUT | `/api/llm-configs/:id/set-default` | Définir comme défaut | ✅ Admin |

### User Stories

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| GET | `/api/user-stories` | Lister (paginé) avec filtres | ✅ |
| POST | `/api/user-stories/sync` | Re-synchroniser depuis source | ✅ |
| GET | `/api/user-stories/:id` | Détail d'une US | ✅ |

### Analyses

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/analyses` | Lancer une analyse `{userStoryId}` | ✅ |
| GET | `/api/analyses/:id` | Résultat d'une analyse | ✅ |

### Générations

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/generations` | Lancer une génération `{analysisId, useImproved}` | ✅ |
| GET | `/api/generations/:id` | Résultat (fichiers inclus) | ✅ |
| GET | `/api/generations` | Historique (paginé) | ✅ |
| GET | `/api/generations/:id/download` | ZIP des fichiers | ✅ |

### Abonnement

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/billing/checkout` | Créer session Stripe Checkout | ✅ Admin |
| POST | `/api/billing/portal` | Portail client Stripe | ✅ Admin |
| POST | `/api/webhooks/stripe` | Webhook Stripe (plan updates) | ❌ (sig) |

---

## 4. Stratégie de Test

### Tests Unitaires (Vitest)

- **LLMClient abstraction :** mock de chaque adapter, vérifier que l'interface uniforme fonctionne avec les 3 providers
- **EncryptionService :** chiffrement/déchiffrement AES-256, cas d'erreur (clé invalide)
- **AnalysisService :** parsing de la réponse JSON du LLM, calcul des scores, gestion des champs manquants
- **GenerationService :** parsing des fichiers générés, validation de la structure POM attendue
- **Jira connector :** mock de l'API Jira, pagination, gestion des erreurs 401/403
- **ADO connector :** mock de l'API ADO, mapping des champs vers le modèle UserStory

### Tests d'Intégration (Supertest)

- **POST /api/analyses :** avec une vraie DB de test (Supabase local via Docker)
- **POST /api/generations :** avec LLM mocké, vérifier que les fichiers sont bien stockés
- **POST /api/webhooks/stripe :** vérifier la mise à jour du plan selon l'événement

### Couverture cible

| Type | Cible |
|------|-------|
| Unit (logique métier) | > 80% |
| Intégration (routes critiques) | 8 routes couvertes |
| E2E manuel (démo Itecor) | 3 parcours : inscription → analyse → génération |

---

## 5. Intégrations Tierces

### Jira Cloud

- **Usage :** Lister les projects, récupérer les issues (stories, tasks)
- **Auth :** Basic Auth (email + API token) encodé en base64
- **Endpoints :** `GET /rest/api/3/project`, `GET /rest/api/3/search?jql=...`
- **Rate limits :** 10 req/sec — mettre en place un délai entre les requêtes de sync

### Azure DevOps

- **Usage :** Lister les work items de type User Story
- **Auth :** PAT (Personal Access Token) encodé en base64
- **Endpoints :** `GET /_apis/projects`, `POST /_apis/wit/wiql`, `GET /_apis/wit/workitems`
- **Version API :** `api-version=7.1`

### OpenAI

- **Usage :** Analyse US + génération tests
- **Auth :** Bearer token (API key)
- **Modèle :** `gpt-4o` (configurable par équipe)
- **Note :** Utiliser `response_format: { type: "json_object" }` pour garantir un JSON parseable

### Azure OpenAI

- **Usage :** Idem OpenAI mais via le tenant Azure du client
- **Auth :** `api-key` header
- **Endpoint :** `https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01`

### Anthropic (Claude)

- **Usage :** Idem analyse + génération
- **Auth :** `x-api-key` header
- **Modèle :** `claude-3-5-sonnet-20241022`
- **Note :** Utiliser les prefill de réponse pour forcer le JSON

### Stripe

- **Usage :** Checkout (souscription), portail client, webhooks
- **Events écoutés :** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Webhook secret :** vérification de signature obligatoire

---

## 6. Déploiement & CI/CD

### Pipeline GitHub Actions

1. **Sur chaque PR :**
   - Lint (ESLint + Prettier)
   - Build TypeScript (vérification types)
   - Tests unitaires (Vitest)
   - Tests d'intégration (Supabase local via Docker)

2. **Sur merge dans `main` :**
   - Tout ce qui précède
   - Deploy backend → Railway (auto depuis GitHub)
   - Deploy frontend → Vercel (auto depuis GitHub)

### Variables d'environnement

| Variable | Description | Où |
|----------|-------------|-----|
| `SUPABASE_URL` | URL projet Supabase | Railway + .env |
| `SUPABASE_SERVICE_KEY` | Clé service Supabase (backend only) | Railway |
| `ENCRYPTION_KEY` | Clé AES-256 pour les credentials | Railway |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | Railway |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe | Railway |
| `VITE_SUPABASE_URL` | URL Supabase (frontend) | Vercel |
| `VITE_SUPABASE_ANON_KEY` | Clé publique Supabase (frontend) | Vercel |
| `VITE_API_URL` | URL backend Railway | Vercel |

### Structure du repo

```
testforge/
├── apps/
│   ├── frontend/          # React + Vite
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── lib/       # API client, utils
│   │   │   └── types/
│   │   └── vite.config.ts
│   └── backend/           # Node.js + Express
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   │   ├── llm/   # LLMClient + adapters
│       │   │   ├── analysis/
│       │   │   ├── generation/
│       │   │   └── connectors/  # Jira + ADO
│       │   ├── middleware/
│       │   ├── db/        # Drizzle schema + migrations
│       │   └── utils/
│       └── tsconfig.json
├── packages/
│   └── shared-types/      # Types TypeScript partagés
├── .github/workflows/
└── package.json           # Monorepo (pnpm workspaces)
```

---

## 7. Sécurité — Implémentation

### Chiffrement des credentials

```typescript
// utils/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8');
}
```

### Interface LLMClient

```typescript
// services/llm/LLMClient.ts
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface LLMClient {
  complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

export interface LLMOptions {
  temperature?: number;   // default: 0.2 pour la génération de code
  maxTokens?: number;
  jsonMode?: boolean;
}

// Sélection du bon adapter selon la config de l'équipe
export function createLLMClient(config: LLMConfig): LLMClient {
  switch (config.provider) {
    case 'openai': return new OpenAIAdapter(config);
    case 'azure_openai': return new AzureOpenAIAdapter(config);
    case 'anthropic': return new AnthropicAdapter(config);
    default: throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}
```
