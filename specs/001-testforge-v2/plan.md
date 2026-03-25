# Implementation Plan: TestForge V2

**Branch**: `001-testforge-v2` | **Date**: 2026-03-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

TestForge V2 étend le MVP V1 (démo Itecor juin 2026) avec 8 features post-lancement regroupées en 7 phases d'implémentation. Les features P1 (Push Git, Writeback, Xray, ADO Test Plans) ferment la boucle "générer → déployer dans les outils d'équipe" et constituent le cœur différenciant de V2. Les features P2 (nouveaux frameworks, Mistral/Ollama, templates POM) élargissent l'adoption. La feature P3 (Super Admin) supporte les opérations internes post-launch.

---

## Technical Context

**Language/Version**: TypeScript strict 5.x (frontend + backend)
**Primary Dependencies**: React 18 + Vite, Node.js 20 + Express, Drizzle ORM, Supabase Auth (JWT), `@octokit/rest` (GitHub), `@mistralai/mistralai` (Mistral), `azure-devops-node-api` (ADO, déjà présent)
**Storage**: PostgreSQL via Supabase — +7 nouvelles tables, +2 colonnes sur tables existantes
**Testing**: Vitest (backend unit + integration), objectif >80% coverage sur la nouvelle logique métier
**Target Platform**: Railway (backend) + Vercel (frontend) — inchangé
**Project Type**: Web SPA + REST API backend (multi-tenant SaaS)
**Performance Goals**: Push Git < 30s, Writeback < 20s, Xray/ADO Test Case < 30s (cohérent avec V1)
**Constraints**: Credentials Git/Xray chiffrés AES-256-GCM, données hébergées EU, pas de clé API en clair dans les logs
**Scale/Scope**: ~50-100 équipes post-démo Itecor (hypothèse); architecture multi-tenant inchangée

---

## Constitution Check

| Principe | Statut | Notes |
|---|---|---|
| TypeScript strict — aucun `any` implicite | ✅ Pass | Tous les nouveaux services en strict mode |
| LLM : toujours via `LLMClient` interface | ✅ Pass | MistralAdapter + OllamaAdapter implémentent `LLMClient` |
| Qualité du code généré (POM + fixtures) | ✅ Pass | Les 6 nouveaux frameworks respectent la même architecture |
| Web app uniquement (React + Vite) | ✅ Pass | Pas d'extension navigateur ni d'app mobile ajoutée |
| Sécurité : credentials chiffrés AES-256-GCM | ✅ Pass | Tokens PAT Git + credentials Xray chiffrés comme les clés LLM V1 |
| RGPD / données EU | ✅ Pass | Aucune donnée sortant de l'EU sauf vers APIs tierces (GitHub, Mistral) selon config client |
| Performance : génération < 30s, analyse < 10s | ✅ Pass | Push/Writeback/Xray ajoutent < 30s chacun |
| Tests > 80% sur logique métier | ✅ Pass | Plan de test défini par phase dans `quickstart.md` |

---

## Project Structure

### Documentation (cette feature)

```text
specs/001-testforge-v2/
├── plan.md              ← ce fichier
├── spec.md              ← spécification fonctionnelle
├── research.md          ← décisions techniques (SDKs, APIs tierces)
├── data-model.md        ← schéma des nouvelles tables
├── quickstart.md        ← guide d'implémentation par phase
├── contracts/
│   └── api.md           ← contrats des nouveaux endpoints REST
└── tasks.md             ← (généré par /speckit.tasks)
```

### Source Code — structure ajoutée en V2

```text
apps/backend/src/
├── services/
│   ├── git/
│   │   ├── GitPushService.ts        ← orchestrateur push (nouveau)
│   │   ├── GitHubAdapter.ts         ← Octokit (nouveau)
│   │   ├── GitLabAdapter.ts         ← fetch REST GitLab v4 (nouveau)
│   │   └── AzureReposAdapter.ts     ← azure-devops-node-api Git (nouveau)
│   ├── writeback/
│   │   └── WritebackService.ts      ← délègue vers JiraConnector/ADOConnector (nouveau)
│   ├── xray/
│   │   └── XrayConnector.ts         ← Xray Cloud REST API v2 (nouveau)
│   └── llm/
│       ├── MistralAdapter.ts        ← @mistralai/mistralai (nouveau)
│       └── OllamaAdapter.ts         ← OpenAI SDK avec baseURL custom (nouveau)
├── routes/
│   ├── git-configs.ts               ← CRUD git configs + test conn (nouveau)
│   ├── writeback.ts                 ← POST writeback + GET history (nouveau)
│   ├── xray.ts                      ← CRUD xray config + POST test (nouveau)
│   ├── pom-templates.ts             ← CRUD templates POM (nouveau)
│   └── admin.ts                     ← dashboard super admin (nouveau)
├── middleware/
│   └── superAdmin.ts                ← requireSuperAdmin middleware (nouveau)
└── db/
    └── schema.ts                    ← +7 tables +2 colonnes (modifié)

apps/backend/src/services/generation/prompts/
├── selenium-csharp.ts               ← (nouveau)
├── selenium-ruby.ts                 ← (nouveau)
├── selenium-kotlin.ts               ← (nouveau)
├── playwright-csharp.ts             ← (nouveau)
├── cypress-js.ts                    ← (nouveau)
├── cypress-ts.ts                    ← (nouveau)
└── registry.ts                      ← +6 entrées (modifié)

apps/frontend/src/
├── pages/
│   ├── GitConfigPage.tsx            ← /settings/git (nouveau)
│   ├── PomTemplatesPage.tsx         ← /settings/pom-templates (nouveau)
│   └── SuperAdminPage.tsx           ← /super-admin (nouveau)
└── components/
    ├── GitPushButton.tsx            ← sur StoryDetailPage onglet Génération (nouveau)
    ├── WritebackButton.tsx          ← sur StoryDetailPage onglet Analyse (nouveau)
    ├── XrayTestButton.tsx           ← sur StoryDetailPage onglet Génération (nouveau)
    └── ADOTestCaseButton.tsx        ← sur StoryDetailPage onglet Génération (nouveau)
```

---

## Phases d'implémentation

### Phase 0 — Infrastructure V2 (socle, ~6h)

**Objectif** : DB migrée, middleware super_admin opérationnel, routes skeleton créées, suspension check en place.

**Fichiers** :
- `apps/backend/src/db/schema.ts` — +7 tables +2 colonnes
- `apps/backend/src/db/migrations/0002_*.sql` à `0011_*.sql` — 10 migrations
- `apps/backend/src/middleware/superAdmin.ts` — `requireSuperAdmin`
- `apps/backend/src/middleware/auth.ts` — ajout check `suspended_at`
- 5 fichiers de routes skeleton (`git-configs`, `writeback`, `xray`, `pom-templates`, `admin`)

**Gate** : `pnpm test` vert, DB migrée sans erreur, routes skeleton retournent 501.

---

### Phase 1 — Push Git (~10h)

**Objectif** : Une équipe Pro peut pousser une génération vers GitHub, GitLab ou Azure Repos en PR ou commit direct.

**Dépendances** : Phase 0 terminée, `@octokit/rest` installé.

**Fichiers** :
- `apps/backend/src/services/git/GitHubAdapter.ts`
- `apps/backend/src/services/git/GitLabAdapter.ts`
- `apps/backend/src/services/git/AzureReposAdapter.ts`
- `apps/backend/src/services/git/GitPushService.ts`
- `apps/backend/src/routes/git-configs.ts` — CRUD complet + test connexion
- Ajout route `POST /api/generations/:id/push` dans `apps/backend/src/routes/generations.ts`
- `apps/frontend/src/pages/GitConfigPage.tsx`
- `apps/frontend/src/components/GitPushButton.tsx`
- `apps/frontend/src/App.tsx` — nouvelle route `/settings/git`

**Gate** : test unitaire `GitPushService` avec mocks (création branche + PR), test E2E manuel sur repo de test.

---

### Phase 2 — Writeback Jira/ADO (~6h)

**Objectif** : Un PO peut pousser la version améliorée d'une US directement vers Jira ou ADO après analyse.

**Dépendances** : Phase 0 terminée.

**Fichiers** :
- `apps/backend/src/services/connectors/JiraConnector.ts` — ajout `updateStory(id, fields)`
- `apps/backend/src/services/connectors/ADOConnector.ts` — ajout `updateWorkItem(id, fields)`
- `apps/backend/src/services/writeback/WritebackService.ts`
- `apps/backend/src/routes/writeback.ts` — complet
- `apps/frontend/src/components/WritebackButton.tsx`

**Gate** : tests unitaires `WritebackService` (mock JiraConnector + ADOConnector), confirmation que l'US est mise à jour en Jira test.

---

### Phase 3 — Xray + ADO Test Plans (~8h)

**Objectif** : Un QA peut créer un test Xray ou un Test Case ADO lié à l'US source depuis une génération.

**Dépendances** : Phase 0 terminée.

**Fichiers** :
- `apps/backend/src/services/xray/XrayConnector.ts`
- Ajout méthodes Test Plans dans `ADOConnector.ts`
- `apps/backend/src/routes/xray.ts` — complet
- Route `POST /api/generations/:id/ado-test-case` dans les routes generations
- `apps/frontend/src/components/XrayTestButton.tsx`
- `apps/frontend/src/components/ADOTestCaseButton.tsx`

**Gate** : tests unitaires `XrayConnector` (mock HTTP), création d'un test Xray sur projet de test Jira.

---

### Phase 4 — Nouveaux frameworks (~8h)

**Objectif** : 6 nouvelles combinaisons disponibles dans le FrameworkSelector.

**Dépendances** : Aucune (indépendant).

**Fichiers** :
- 6 fichiers de prompts dans `apps/backend/src/services/generation/prompts/`
- `registry.ts` — +6 entrées
- Frontend : `FrameworkSelector` — options ajoutées automatiquement via registry

**Gate** : pour chaque combo, générer avec une US de référence et vérifier que le code compile + respecte POM.

---

### Phase 5 — Mistral + Ollama (~5h)

**Objectif** : Les équipes Pro peuvent utiliser Mistral ou Ollama comme provider LLM.

**Dépendances** : Phase 0 (`ollama_endpoint` migration), `@mistralai/mistralai` installé.

**Fichiers** :
- `apps/backend/src/services/llm/MistralAdapter.ts`
- `apps/backend/src/services/llm/OllamaAdapter.ts`
- `apps/backend/src/services/llm/index.ts` — +2 cases dans factory
- `apps/frontend/src/pages/LLMConfigPage.tsx` — champs Ollama endpoint + sélecteur Mistral

**Gate** : tests unitaires adapters (mock HTTP), analyse + génération fonctionnelles avec Mistral cloud.

---

### Phase 6 — Templates POM (~4h)

**Objectif** : Une équipe peut définir un template de page object qui influence les générations suivantes.

**Dépendances** : Phase 0 terminée.

**Fichiers** :
- `apps/backend/src/routes/pom-templates.ts` — complet
- `apps/backend/src/services/generation/GenerationService.ts` — ajout `injectPomTemplate()`
- `apps/frontend/src/pages/PomTemplatesPage.tsx`
- `apps/frontend/src/App.tsx` — route `/settings/pom-templates`

**Gate** : test unitaire injection template dans prompt, vérification manuelle que le code généré reflète le template.

---

### Phase 7 — Super Admin (~5h)

**Objectif** : Alexandre peut consulter l'état de tous les clients et suspendre/réactiver des comptes.

**Dépendances** : Phase 0 (table `super_admins` + colonne `suspended_at`).

**Fichiers** :
- `apps/backend/src/routes/admin.ts` — complet
- `apps/frontend/src/pages/SuperAdminPage.tsx`
- `apps/frontend/src/App.tsx` — route protégée `/super-admin`
- `apps/backend/scripts/seed-super-admin.ts` — seed du premier super_admin

**Gate** : test 403 sur routes admin sans rôle, test suspension → accès révoqué pour les membres de l'équipe.

---

## Estimation totale

| Phase | Effort estimé |
|---|---|
| Phase 0 — Infrastructure V2 | ~6h |
| Phase 1 — Push Git | ~10h |
| Phase 2 — Writeback | ~6h |
| Phase 3 — Xray + ADO Test Plans | ~8h |
| Phase 4 — Nouveaux frameworks | ~8h |
| Phase 5 — Mistral + Ollama | ~5h |
| Phase 6 — Templates POM | ~4h |
| Phase 7 — Super Admin | ~5h |
| **Total** | **~52h** (~5-6 semaines à 8-10h/semaine) |

**Objectif de livraison** : Q3 2026 (post-démo Itecor juin 2026).
