# Data Model — TestForge V2

**Branch**: `001-testforge-v2` | **Date**: 2026-03-25

---

## Nouvelles Tables

### `git_configs`

Configuration d'un repo Git cible par équipe.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `team_id` | uuid FK → teams | onDelete cascade |
| `provider` | text | `'github'` \| `'gitlab'` \| `'azure_repos'` |
| `name` | text | Libellé affiché (ex: "Repo Tests E2E") |
| `repo_url` | text | URL HTTPS du repo (ex: `https://github.com/org/repo`) |
| `encrypted_token` | text | PAT chiffré AES-256-GCM |
| `default_branch` | text | Branche cible par défaut (ex: `main`) |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Index**: `(team_id)` — liste des configs d'une équipe.

---

### `git_pushes`

Historique de chaque push git effectué depuis une génération.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `generation_id` | uuid FK → generations | onDelete cascade |
| `git_config_id` | uuid FK → git_configs | onDelete set null |
| `team_id` | uuid FK → teams | pour isolation et requêtes rapides |
| `mode` | text | `'commit'` \| `'pr'` |
| `branch_name` | text | Branche créée (ex: `testforge/US-42-login`) |
| `commit_sha` | text | SHA du commit créé (nullable si PR en attente) |
| `pr_url` | text | URL de la PR créée (nullable si mode commit) |
| `status` | text | `'pending'` \| `'success'` \| `'error'` |
| `error_message` | text | Message d'erreur si status = error |
| `created_at` | timestamptz | defaultNow() |

**Index**: `(generation_id)` — historique des pushes d'une génération.

---

### `writeback_history`

Historique des mises à jour d'US source depuis les analyses.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `analysis_id` | uuid FK → analyses | onDelete cascade |
| `user_story_id` | uuid FK → user_stories | pour requêtes directes |
| `team_id` | uuid FK → teams | isolation |
| `content_before` | text | Contenu original (description + AC) |
| `content_after` | text | Contenu mis à jour poussé dans la source |
| `source_type` | text | `'jira'` \| `'azure_devops'` |
| `pushed_by` | uuid | userId Supabase de l'auteur |
| `created_at` | timestamptz | defaultNow() |

---

### `xray_configs`

Configuration Xray Cloud par équipe.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `team_id` | uuid FK → teams | onDelete cascade, unique |
| `project_key` | text | Clé projet Jira/Xray (ex: `PROJ`) |
| `encrypted_credentials` | text | `{clientId, clientSecret}` chiffré AES-256-GCM |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Contrainte**: une seule config Xray par équipe (`unique(team_id)`).

---

### `xray_tests`

Référence aux tests Xray créés depuis des générations.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `generation_id` | uuid FK → generations | onDelete cascade |
| `team_id` | uuid FK → teams | isolation |
| `xray_test_id` | text | ID numérique interne Xray |
| `xray_test_key` | text | Clé Jira du test (ex: `PROJ-123`) |
| `created_at` | timestamptz | defaultNow() |

---

### `ado_test_cases`

Référence aux Test Cases ADO créés depuis des générations.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `generation_id` | uuid FK → generations | onDelete cascade |
| `team_id` | uuid FK → teams | isolation |
| `test_case_id` | integer | ID du Test Case work item ADO |
| `test_suite_id` | integer | ID du Test Suite où rattaché (nullable) |
| `test_plan_id` | integer | ID du Test Plan (nullable) |
| `created_at` | timestamptz | defaultNow() |

---

### `pom_templates`

Templates de page object personnalisés par équipe, framework et langage.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `team_id` | uuid FK → teams | onDelete cascade |
| `framework` | text | `'playwright'` \| `'selenium'` \| `'cypress'` |
| `language` | text | `'typescript'` \| `'javascript'` \| `'python'` \| `'java'` \| `'csharp'` \| `'ruby'` \| `'kotlin'` |
| `content` | text | Contenu du template (texte libre) |
| `created_at` | timestamptz | defaultNow() |
| `updated_at` | timestamptz | defaultNow() |

**Index**: `unique(team_id, framework, language)` — un seul template par combo par équipe.

---

### `super_admins`

Rôle système global — indépendant des équipes.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | defaultRandom() |
| `user_id` | uuid | userId Supabase Auth, unique |
| `created_at` | timestamptz | defaultNow() |

---

## Modifications de Tables Existantes

### `llm_configs` — ajout colonnes Ollama

| Colonne ajoutée | Type | Notes |
|---|---|---|
| `ollama_endpoint` | text | URL du serveur Ollama (ex: `http://localhost:11434`), nullable |

> Le champ `provider` (text) supporte déjà les nouvelles valeurs `'mistral'` et `'ollama'` sans migration de type.
> Le champ `encrypted_api_key` stocke la clé Mistral. Pour Ollama, stocker une valeur placeholder `'local'` (pas de clé réelle).

### `teams` — ajout colonne suspension

| Colonne ajoutée | Type | Notes |
|---|---|---|
| `suspended_at` | timestamptz | Null = actif, non-null = suspendu depuis cette date |

---

## Relations clés

```
teams ─── git_configs (1:N)
       ─── xray_configs (1:1)
       ─── pom_templates (1:N, unique par framework+language)

generations ─── git_pushes (1:N)
            ─── xray_tests (1:N)
            ─── ado_test_cases (1:N)

analyses ─── writeback_history (1:N)

super_admins ── user_id (standalone, pas de FK vers teams)
```

---

## Migrations Drizzle (ordre d'exécution)

1. `0002_add_teams_suspended_at.sql` — colonne `suspended_at` sur `teams`
2. `0003_add_llm_ollama_endpoint.sql` — colonne `ollama_endpoint` sur `llm_configs`
3. `0004_add_git_configs.sql` — table `git_configs`
4. `0005_add_git_pushes.sql` — table `git_pushes`
5. `0006_add_writeback_history.sql` — table `writeback_history`
6. `0007_add_xray_configs.sql` — table `xray_configs`
7. `0008_add_xray_tests.sql` — table `xray_tests`
8. `0009_add_ado_test_cases.sql` — table `ado_test_cases`
9. `0010_add_pom_templates.sql` — table `pom_templates`
10. `0011_add_super_admins.sql` — table `super_admins`
