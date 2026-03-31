# Constitution — TestForge Jira Forge Extension
**Version:** 1.0.0
**Date:** 2026-03-29
**Feature branch:** `012-jira-forge-extension`

---

## Mission

Étendre la valeur de TestForge directement dans l'interface Jira : afficher le score de testabilité d'une user story sans quitter Jira, et orienter naturellement vers TestForge pour les analyses complètes et la génération de tests.

---

## Principes immuables

### Architecture

- L'extension MUST être une **Jira Forge App** (Custom UI via iframe) — pas une extension navigateur Chrome/Firefox, pas une Connect App dépréciée.
- L'extension MUST vivre dans le monorepo TestForge sous `apps/jira-forge/` et partager `packages/shared-types/`.
- Le backend TestForge MUST rester la seule source de vérité — l'extension Forge ne stocke **jamais** de données métier, uniquement le token de couplage via Forge Storage API.
- Les appels LLM MUST passer exclusivement par le backend TestForge existant — l'extension n'appelle jamais un provider LLM directement.
- L'extension MUST supporter **deux modes** sans exception : mode anonyme (non-client) et mode authentifié (client TestForge avec token).

### Sécurité

- Le token TestForge (API token) MUST être stocké via `@forge/api` Storage API (chiffré côté Atlassian), JAMAIS en localStorage ou en mémoire côté React.
- Le token MUST transiter uniquement via HTTPS, dans le header `Authorization: Bearer <token>`.
- Les endpoints `/api/jira-panel/*` du backend MUST valider le token et le `team_id` associé avant tout accès aux données.
- En mode anonyme, le backend MUST exécuter uniquement un scoring heuristique (pas d'appel LLM) pour éviter les abus de coûts.
- L'extension MUST respecter le modèle multi-tenant de TestForge : un token est lié à une équipe, JAMAIS global.

### UX

- L'extension MUST fonctionner avec un **chargement initial < 2s** (heuristique) et < 8s (LLM complet).
- Le mode anonyme MUST afficher de la valeur réelle (score heuristique) — pas un écran vide ni un simple teaser marketing.
- L'extension MUST inclure un **deep-link direct** vers l'US dans TestForge, avec `issueKey` pré-rempli.
- L'extension MUST fonctionner sans rechargement de page Jira lors des interactions.

### Démo juin 2026

- La v1 est déployée en **mode développeur Forge uniquement** (`forge deploy` + `forge install` sur l'instance Jira de test Alexandre) — pas de soumission Marketplace.
- La démo MUST pouvoir tourner sur l'instance Jira personnelle d'Alexandre sans dépendance externe.

### Non-négociables de développement TestForge

- Test-first (Red → Green → Refactor) sans exception.
- TypeScript strict mode, aucun `any` implicite.
- Aucune breaking change sur les routes API existantes.
- Documentation (README + User Guide) mise à jour après chaque changement.
- Tout changement passe par le spec-kit.

---

## Hors périmètre v1 (post-démo)

- Soumission Atlassian Marketplace (public ou private listing)
- Support Azure DevOps (Boards) — extension équivalente
- Mode "trigger génération depuis Jira" (générer les tests sans quitter Jira)
- Writeback du score dans un Jira custom field
- Notifications Jira (score insuffisant → commentaire automatique)
- Support multi-instances Jira par équipe TestForge
