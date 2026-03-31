# Plan — TestForge Jira Forge Extension
**Version:** 1.0.0
**Date:** 2026-03-29
**Feature branch:** `012-jira-forge-extension`
**Voir aussi:** spec.md pour les user stories, tasks.md pour l'implémentation

---

## 1. Architecture générale

```
[Jira Issue Page]
    │
    └─► [Forge IssuePanel — Custom UI (iframe)]
              │  apps/jira-forge/src/frontend/
              │  @forge/react + React 18 + TypeScript
              │
              │  forge.fetch() (proxy Atlassian sécurisé)
              │
              ▼
        [Backend TestForge — Railway]
        apps/backend/src/routes/jiraPanel.ts
              │
              ├─► [Mode anonyme] → HeuristicScoringService (no LLM)
              └─► [Mode authentifié] → AnalysisService existant
                        │
                        ├─► Supabase (cache score existant)
                        └─► LLMClient (si analyse à déclencher)
```

### Composants créés/modifiés

| Composant | Nouveau / Modifié | Chemin |
|---|---|---|
| `apps/jira-forge/` | Nouveau | App Forge complète |
| `HeuristicScoringService` | Nouveau | `apps/backend/src/services/heuristic/` |
| `jiraPanel.ts` routes | Nouveau | `apps/backend/src/routes/jiraPanel.ts` |
| `api_tokens` table | Nouveau | `apps/backend/src/db/schema.ts` |
| `ApiTokenService` | Nouveau | `apps/backend/src/services/apiTokens/` |
| `SettingsPage.tsx` (section tokens) | Modifié | `apps/frontend/src/pages/SettingsPage.tsx` |

---

## 2. Structure `apps/jira-forge/`

```
apps/jira-forge/
├── manifest.yml              # Config Forge : module IssuePanel, permissions
├── package.json
├── tsconfig.json
├── src/
│   ├── frontend/             # React app (iframe Custom UI)
│   │   ├── index.tsx
│   │   ├── App.tsx           # Router : AnonymousPanel | AuthPanel | ConnectPanel
│   │   ├── components/
│   │   │   ├── ScoreGauge.tsx       # Visualisation score circulaire
│   │   │   ├── DimensionBars.tsx    # Barres par dimension
│   │   │   ├── SuggestionList.tsx   # Liste suggestions
│   │   │   ├── ConnectForm.tsx      # Saisie + validation token
│   │   │   └── LoadingState.tsx     # Spinner + étapes
│   │   └── hooks/
│   │       ├── useForgeContext.ts   # issueKey, cloudId depuis @forge/bridge
│   │       ├── useTestForgeScore.ts # Appel backend + state
│   │       └── useTokenStorage.ts  # Read/write Forge Storage API
│   └── index.ts              # Forge resolver (pont iframe ↔ backend Forge)
```

### `manifest.yml` (structure clé)

```yaml
modules:
  jira:issuePanel:
    - key: testforge-score-panel
      title: TestForge Score
      resource: main
      resolver:
        function: resolver
      render: native
      viewportSize: medium

permissions:
  scopes:
    - read:jira-work     # lire le contenu de l'issue (summary, description, AC)
    - storage:app        # Forge Storage API pour le token
  external:
    fetch:
      backend:
        - https://api.testforge.io  # ton domaine Railway en prod
        - http://localhost:3001     # dev local
```

---

## 3. Scoring Heuristique (mode anonyme)

Algorithme basé sur des règles — **aucun appel LLM**, résultat en < 100ms.

### Dimension 1 — Clarté (30%)

| Règle | Points |
|---|---|
| Présence du format "En tant que / Je veux / Afin de" | +25 |
| Longueur description > 50 mots | +20 |
| Absence de mots vagues ("quelque chose", "etc", "à voir") | +15 |
| Titre > 10 mots | +10 |
| Présence d'un contexte fonctionnel | +30 |

### Dimension 2 — Critères d'acceptance (40%)

| Règle | Points |
|---|---|
| Présence d'une section "Critères d'acceptance" ou "AC" | +30 |
| Nombre de critères ≥ 3 | +20 |
| Présence de verbes d'action (DOIT, WHEN, THEN) | +20 |
| Présence de cas négatifs / cas d'erreur | +30 |

### Dimension 3 — Données de test (30%)

| Règle | Points |
|---|---|
| Présence d'exemples concrets (chiffres, noms, valeurs) | +35 |
| Présence de "par exemple" / "ex:" / "sample" | +25 |
| Présence de scénarios multiples | +40 |

### Score final = moyenne pondérée des 3 dimensions

### Suggestions automatiques (règles → suggestions)

```typescript
const SUGGESTIONS_MAP = [
  { condition: (us) => !hasAcceptanceCriteria(us), 
    suggestion: "Ajouter des critères d'acceptance (WHEN/THEN)" },
  { condition: (us) => !hasTestData(us),
    suggestion: "Préciser les données de test avec des exemples concrets" },
  { condition: (us) => !hasInvestFormat(us),
    suggestion: "Reformuler en 'En tant que... Je veux... Afin de...'" },
  { condition: (us) => !hasNegativeCase(us),
    suggestion: "Ajouter un cas d'erreur ou cas limite" },
  { condition: (us) => getTitleLength(us) < 5,
    suggestion: "Enrichir le titre pour refléter le comportement attendu" },
];
```

---

## 4. API Backend — Nouveaux endpoints

### `GET /api/jira-panel/score`

**Authentification :** optionnelle (Bearer token TestForge)

**Query params :**
- `issueKey` : string (ex: "PROJ-42")
- `cloudId` : string (ID instance Jira)
- `summary` : string (titre de l'issue, encodé URL)
- `description` : string (corps, encodé URL, tronqué à 2000 chars)

**Sans token (mode heuristique) :**
```json
{
  "mode": "heuristic",
  "score": 62,
  "level": "needs_improvement",
  "dimensions": {
    "clarity": 68,
    "acceptanceCriteria": 52,
    "testData": 38
  },
  "suggestions": [
    "Ajouter des critères d'acceptance (WHEN/THEN)",
    "Préciser les données de test avec des exemples concrets"
  ]
}
```

**Avec token valide (mode LLM) :**
```json
{
  "mode": "llm",
  "score": 78,
  "level": "ready",
  "dimensions": {
    "clarity": 82,
    "acceptanceCriteria": 76,
    "testData": 72,
    "independence": 88,
    "size": 60
  },
  "suggestions": [],
  "analyzedAt": "2026-03-14T10:23:00Z",
  "testforgeUrl": "https://app.testforge.io/stories?issueKey=PROJ-42"
}
```

**Règles métier :**
- Avec token : chercher d'abord en cache (table `analyses`) via `externalId = issueKey + cloudId`
- Si pas en cache → retourner `{ mode: 'llm', status: 'not_analyzed' }` (ne pas lancer l'analyse automatiquement)
- Valider que le token correspond bien à une équipe ayant une `sourceConnection` avec ce `cloudId`

---

### `POST /api/jira-panel/analyze`

**Authentification :** Bearer token requis

**Body :**
```json
{
  "issueKey": "PROJ-42",
  "cloudId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "summary": "Titre de l'issue",
  "description": "Description complète..."
}
```

**Comportement :**
1. Valider token → récupérer `teamId`
2. Trouver la `sourceConnection` correspondant au `cloudId` pour cette équipe
3. Trouver (ou créer) la `userStory` correspondant à l'`issueKey`
4. Lancer `AnalysisService.analyze()` (service existant)
5. Retourner `202 Accepted` + `{ analysisId }` (async — pattern existant feature 008-progress-tracking)

---

### `POST /api/jira-panel/token/validate`

**Authentification :** aucune (endpoint public)

**Body :**
```json
{ "token": "tf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

**Réponse 200 :**
```json
{
  "valid": true,
  "teamName": "Equipe QA Itecor",
  "teamId": "uuid"
}
```

**Réponse 401 :**
```json
{ "valid": false, "error": "Token invalide ou révoqué" }
```

---

### `GET /api/tokens` — Liste des API tokens de l'équipe

**Authentification :** JWT TestForge standard

**Réponse :**
```json
{
  "tokens": [
    {
      "id": "uuid",
      "name": "Jira Extension",
      "createdAt": "2026-03-01T...",
      "lastUsedAt": "2026-03-28T...",
      "revokedAt": null
    }
  ]
}
```

---

### `POST /api/tokens` — Générer un nouveau token

**Body :** `{ "name": "Jira Extension" }`

**Réponse 201 :** `{ "id": "uuid", "token": "tf_xxxxxxxxxxxxxxxx", "name": "..." }`

⚠️ Le champ `token` n'est retourné **qu'une seule fois** — jamais en relecture.

---

### `DELETE /api/tokens/:id` — Révoquer un token

**Réponse 204** (soft delete : `revokedAt = now()`)

---

## 5. Schéma DB — Nouvelle table `api_tokens`

```sql
CREATE TABLE api_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,  -- SHA-256 du token brut
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_api_tokens_team_id ON api_tokens(team_id);
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
```

**Format du token brut :** `tf_` + 32 caractères hex aléatoires = `tf_a1b2c3d4e5f6...`

**Stockage :** seul le SHA-256 du token est stocké en DB. Le token brut est retourné une seule fois à la création, jamais relu.

---

## 6. Stratégie de tests

### Backend

| Scope | Type | Cas couverts |
|---|---|---|
| `HeuristicScoringService` | Unitaire | Chaque règle, US vide, US parfaite, US partielle |
| `ApiTokenService` | Unitaire | génération, hachage, validation, révocation |
| `GET /api/jira-panel/score` (anonyme) | Intégration | Sans token, avec token invalide, avec token valide + cache hit, + no cache |
| `POST /api/jira-panel/token/validate` | Intégration | Token valide, révoqué, inexistant |
| `POST /api/tokens` | Intégration | Création, unicité du hash, réponse one-time |
| `DELETE /api/tokens/:id` | Intégration | Soft delete, vérification ownership |

### Frontend Forge

Tests unitaires React (`@testing-library/react`) sur :
- `ScoreGauge` : rendering correct selon le score
- `ConnectForm` : états loading/error/success
- `useTestForgeScore` : gestion des états (loading, heuristic, llm, not_analyzed, error)

### Non-régression

- Vérifier que les routes existantes (`/api/analyses`, `/api/generations`, etc.) ne sont pas impactées
- Vérifier que `SettingsPage` existant ne casse pas avec l'ajout de la section tokens

---

## 7. Déploiement

### Forge (extension)

```bash
# Install Forge CLI
npm install -g @forge/cli

# Dans apps/jira-forge/
forge deploy          # déploie sur l'infra Atlassian
forge install         # installe sur l'instance Jira de test
```

**Pour la démo :** utiliser `forge tunnel` en live — l'extension Jira appelle le backend local en temps réel. Effet démo maximal, aucune latence de déploiement.

```bash
# Terminal 1 : backend local
pnpm --filter backend dev

# Terminal 2 : forge tunnel (reroute les appels Jira vers localhost)
cd apps/jira-forge && forge tunnel
```

### Backend

Aucun changement de déploiement Railway — les nouveaux endpoints sont dans le même serveur Express.

---

## 8. Décision à prendre post-démo

**Atlassian Marketplace :**
- Distribution **privée** (listing privé, URL d'installation directe) → adapté pour vendre à des clients enterprise sans review publique complexe
- Distribution **publique** (Marketplace listing) → visibilité maximale, review Atlassian obligatoire (4-8 semaines), nécessite security review

Recommandation : commencer par **privé**, passer public quand la base clients justifie l'effort de review.
