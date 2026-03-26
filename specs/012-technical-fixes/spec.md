# Technical Fixes

**Feature Branch**: `012-technical-fixes`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Corrections de bugs et faiblesses techniques identifiées lors de l'audit du code source. Trois problèmes distincts, tous impactant la fiabilité en production.

---

## Bug 1 — JiraConnector : champ Acceptance Criteria non configurable

### Problème

`JiraConnector.updateStory()` utilise un fallback qui append les AC dans la description quand le custom field n'est pas connu. Le nom du champ AC est un custom field variable selon les instances Jira (peut être `customfield_10016`, `customfield_10020`, ou un champ nommé différemment).

### Solution

Ajouter un champ optionnel `ac_field_id` dans la table `source_connections`. Quand il est renseigné, le writeback utilise ce champ pour les AC. Quand il est null, le comportement actuel (append dans description) est conservé avec un warning.

### Impact

Sans ce fix, le writeback Jira corrompt potentiellement la description en y appendant les AC au lieu de les mettre dans le bon champ. Problème critique pour les clients qui comptent sur le writeback.

---

## Bug 2 — WritebackService : même contenu pour description et AC

### Problème

`WritebackService.writeback()` envoie `analysis.improvedVersion` à la fois pour `description` ET `acceptanceCriteria`. C'est le même texte, alors que la version améliorée de l'analyse devrait séparer les deux (description améliorée vs AC améliorés).

### Solution

Le prompt d'analyse doit retourner deux champs distincts dans `improvedVersion` : `improvedDescription` et `improvedAcceptanceCriteria`. En attendant la modification du prompt, le fix immédiat est de parser l'`improvedVersion` pour séparer la partie description de la partie AC (le LLM les sépare généralement par un header "Critères d'acceptance" ou "Acceptance Criteria").

### Impact

Les writebacks actuels écrasent les AC avec la description améliorée, ce qui est incorrect. Fix prioritaire si le writeback est utilisé.

---

## Bug 3 — ApiClient frontend : pas de retry ni refresh token

### Problème

`apps/frontend/src/lib/api.ts` — l'`ApiClient` ne gère pas les cas suivants :
- JWT expiré pendant une session longue → toutes les requêtes échouent 401 silencieusement
- Erreur réseau temporaire → pas de retry
- Token refresh → Supabase le fait automatiquement mais l'ApiClient ne re-fetch pas le token après un 401

### Solution

1. Sur réception d'un 401 : appeler `supabase.auth.refreshSession()`, puis re-tenter la requête avec le nouveau token
2. Sur erreur réseau (TypeError: Failed to fetch) : retry avec backoff exponentiel (max 2 retries)
3. Si le refresh échoue → rediriger vers `/login`

### Impact

Les utilisateurs avec des sessions longues (> 1h) perdent leur session sans comprendre pourquoi. Les requêtes échouent silencieusement. Fix important pour l'UX en production.

---

## Requirements

- **FR-TF-001**: Le champ AC de Jira DOIT être configurable par connexion via un `ac_field_id` optionnel.
- **FR-TF-002**: Le writeback DOIT séparer description et AC en deux contenus distincts.
- **FR-TF-003**: L'ApiClient DOIT retry automatiquement sur 401 après refresh du token.
- **FR-TF-004**: L'ApiClient DOIT retry sur erreur réseau (max 2, backoff exponentiel).
- **FR-TF-005**: Si le refresh token échoue, l'utilisateur DOIT être redirigé vers la page de login.

---

# Tasks

## Fix 1 — Jira AC Field configurable (~2h)

- [ ] T001 [P] Ajouter colonne `ac_field_id` (text, nullable) sur `source_connections` — migration
- [ ] T002 [P] Modifier `JiraConnector.updateStory()` :
  - Si `acFieldId` est fourni → utiliser ce champ pour les AC
  - Sinon → comportement actuel (append dans description) + log warning
- [ ] T003 Ajouter le champ `acFieldId` dans le formulaire de connexion Jira (frontend) avec un placeholder "Ex: customfield_10020 — laisser vide si inconnu"
- [ ] T004 Modifier `POST /api/connections` et `PUT /api/connections/:id` pour accepter `acFieldId`

## Fix 2 — WritebackService séparation desc/AC (~3h)

- [ ] T005 [P] Modifier le prompt d'analyse (`analysis-v1.0.ts`) pour retourner `improvedDescription` ET `improvedAcceptanceCriteria` séparément dans la réponse JSON
- [ ] T006 [P] Ajouter deux colonnes dans `analyses` : `improved_description` (text) et `improved_acceptance_criteria` (text) — migration. L'ancien `improved_version` reste pour rétrocompatibilité
- [ ] T007 [P] Modifier `AnalysisService.parseResponse()` pour extraire les deux champs. Fallback : si le LLM retourne un seul `improvedVersion`, tenter de le parser (split sur "Critères d'acceptance" ou "Acceptance Criteria")
- [ ] T008 [P] Modifier `WritebackService.writeback()` :
  - Utiliser `improvedDescription` pour le champ description
  - Utiliser `improvedAcceptanceCriteria` pour le champ AC
  - Fallback sur l'ancien `improvedVersion` si les nouveaux champs sont null
- [ ] T009 Tests unitaires : writeback avec les deux champs séparés, fallback sur l'ancien format

## Fix 3 — ApiClient retry + refresh (~2h)

- [ ] T010 [P] Modifier `apps/frontend/src/lib/api.ts` — méthode `request()` :
  ```typescript
  // Si 401 → refresh session → retry une fois
  if (response.status === 401) {
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    // Re-fetch avec le nouveau token
    return this.request<T>(path, options);
  }
  ```
- [ ] T011 Ajouter retry sur erreur réseau (TypeError) avec backoff : 1s, 3s, abandon
- [ ] T012 Ajouter un flag `_retried` pour éviter les boucles infinies de retry sur 401
- [ ] T013 Ajouter un toast notification quand le token est refreshé automatiquement ("Session renouvelée")

---

## Estimation totale

| Fix | Effort |
|---|---|
| Fix 1 — Jira AC Field | ~2h |
| Fix 2 — WritebackService | ~3h |
| Fix 3 — ApiClient retry | ~2h |
| **Total** | **~7h** |

---

# CLAUDE_TASK — 012-technical-fixes

> Corrections de bugs et dette technique.
> `claude < specs/012-technical-fixes/spec.md`

## Fix 1 — Jira AC Field

1. Migration : colonne `ac_field_id` sur `source_connections`
2. `JiraConnector.updateStory()` : utiliser `acFieldId` si fourni
3. Frontend : champ optionnel dans le formulaire de connexion Jira
4. `pnpm --filter backend test`

## Fix 2 — WritebackService

1. Modifier le prompt d'analyse : retourner `improvedDescription` + `improvedAcceptanceCriteria` séparément
2. Migration : 2 colonnes sur `analyses`
3. `AnalysisService.parseResponse()` : extraire les deux champs
4. `WritebackService.writeback()` : utiliser les champs séparés
5. `pnpm --filter backend test`

## Fix 3 — ApiClient

1. `api.ts` : intercepter 401 → `supabase.auth.refreshSession()` → retry
2. Retry réseau avec backoff (1s, 3s)
3. Guard `_retried` anti-boucle infinie
4. `pnpm --filter frontend typecheck`

```bash
git commit -m "fix: 012-technical-fixes — jira AC field, writeback separation, API retry"
```
