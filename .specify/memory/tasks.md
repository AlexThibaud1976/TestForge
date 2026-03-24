# Checklist d'Implémentation — TestForge

> Dernière mise à jour : Mars 2026
> Rythme : 8-10h/semaine (soirs + weekends)
> Deadline : Démo petit-déjeuner Itecor — début juin 2026 (~10 semaines)

---

## Vue d'ensemble des phases

| Phase | Thème | Semaines | Heures est. |
|-------|-------|----------|-------------|
| 1 | Socle & Infrastructure | S1-S2 | 18h |
| 2 | Connexions & Import US | S3-S4 | 18h |
| 3 | Analyse qualité des US | S5-S6 | 18h |
| 4 | Génération de tests | S7-S8 | 18h |
| 5 | Auth, Équipes & Billing | S9 | 10h |
| 6 | Polish & Démo Itecor | S10 | 8h |

---

## Phase 1 — Socle & Infrastructure (Semaines 1-2)

> Objectif : repo fonctionnel, CI verte, DB connectée, LLMClient testé avec 2 providers

### Repo & Config (soir semaine 1)
- [ ] Initialiser le monorepo pnpm workspaces (`apps/frontend`, `apps/backend`, `packages/shared-types`)
- [ ] Configurer TypeScript strict sur frontend et backend
- [ ] Configurer ESLint + Prettier (règles communes)
- [ ] Configurer Vitest (backend) + coverage
- [ ] Créer le repo GitHub + branch strategy (`main` = prod, `develop` = intégration)

### CI/CD (soir semaine 1)
- [ ] GitHub Actions : lint + typecheck + tests sur chaque PR
- [ ] GitHub Actions : deploy Railway (backend) sur push `main`
- [ ] GitHub Actions : deploy Vercel (frontend) sur push `main`
- [ ] Variables d'environnement configurées sur Railway et Vercel

### Base de données (weekend semaine 1)
- [ ] Créer le projet Supabase (région EU)
- [ ] Configurer Drizzle ORM + connexion backend
- [ ] Écrire et exécuter la migration initiale (tables : `teams`, `team_members`, `llm_configs`)
- [ ] Configurer le client Supabase Auth côté backend (vérification JWT)

### LLMClient abstraction (weekend semaine 1 + soirs semaine 2)
- [ ] Créer l'interface `LLMClient` + types `LLMMessage`, `LLMResponse`, `LLMOptions`
- [ ] Implémenter `OpenAIAdapter` (gpt-4o) avec `response_format: json_object`
- [ ] Implémenter `AzureOpenAIAdapter` (même modèle, endpoint configurable)
- [ ] Implémenter `AnthropicAdapter` (claude-3-5-sonnet) avec prefill JSON
- [ ] Implémenter `createLLMClient(config)` factory function
- [ ] Écrire les tests unitaires des 3 adapters (mock des APIs externes)
- [ ] Tester manuellement les 3 providers avec un prompt simple

### Chiffrement (soir semaine 2)
- [ ] Implémenter `encrypt()` / `decrypt()` AES-256-GCM
- [ ] Écrire les tests unitaires du module encryption
- [ ] Configurer la variable `ENCRYPTION_KEY` en prod + local

### Frontend scaffold (weekend semaine 2)
- [ ] Initialiser React + Vite + TypeScript
- [ ] Configurer Tailwind CSS + shadcn/ui (composants de base)
- [ ] Créer le layout principal (header, sidebar, content area)
- [ ] Créer le client API HTTP (`lib/api.ts` avec fetch + gestion d'erreurs)
- [ ] Configurer Supabase Auth côté frontend (session persistante)

**✅ Fin Phase 1 : CI verte, LLMClient fonctionne avec 3 providers, DB créée, frontend accessible en local**

---

## Phase 2 — Connexions & Import User Stories (Semaines 3-4)

> Objectif : pouvoir importer des US depuis un Jira perso et depuis une démo ADO

### Connecteur Jira (soirs + weekend semaine 3)
- [ ] Migration DB : table `source_connections`
- [ ] Implémenter `JiraConnector` : test de connexion, liste des projets, recherche JQL
- [ ] Endpoint `POST /api/connections` (créer une connexion Jira, credentials chiffrés)
- [ ] Endpoint `POST /api/connections/:id/test` (valider la connexion)
- [ ] Écrire les tests unitaires `JiraConnector` (API mockée)
- [ ] **Tester avec ton Jira perso** — importer les US de test créées en semaine 1

### Connecteur Azure DevOps (soirs + weekend semaine 4)
- [ ] Implémenter `ADOConnector` : test connexion, liste projets, query work items
- [ ] Mapping champs ADO → modèle `UserStory` (Title, Description, Acceptance Criteria)
- [ ] Endpoint `POST /api/connections` (type `azure_devops`)
- [ ] Écrire les tests unitaires `ADOConnector` (API mockée)

### Import et stockage des US
- [ ] Migration DB : table `user_stories`
- [ ] Endpoint `POST /api/user-stories/sync` (importe/met à jour les US depuis la source)
- [ ] Endpoint `GET /api/user-stories` (liste paginée avec filtres sprint/statut)
- [ ] Endpoint `GET /api/user-stories/:id` (détail d'une US)

### Interface liste des US (weekend semaine 4)
- [ ] Page "User Stories" avec liste, filtres et recherche
- [ ] Composant `UserStoryCard` (titre, statut, score si déjà analysée)
- [ ] Page détail d'une US (titre, description, critères d'acceptance)
- [ ] Bouton "Analyser cette US" (désactivé pour l'instant — phase 3)
- [ ] Page "Connexions" (formulaire d'ajout Jira + ADO)

**✅ Fin Phase 2 : les US de ton Jira perso s'affichent dans l'interface**

---

## Phase 3 — Analyse Qualité des US (Semaines 5-6)

> Objectif : le cœur du produit — analyser une US et obtenir un score + suggestions en < 10s

### Prompts d'analyse (soirs semaine 5)
- [ ] Écrire le prompt système d'analyse qualité (versionné `v1.0`)
- [ ] Définir le schéma JSON de réponse attendu (scores + suggestions + improved_version)
- [ ] Tester le prompt manuellement sur 10 US variées (bonnes et mauvaises)
- [ ] Itérer sur le prompt jusqu'à des résultats cohérents et pertinents
- [ ] Documenter les edge cases identifiés (US trop courtes, en français, sans description)

### Service d'analyse (weekend semaine 5)
- [ ] Migration DB : table `analyses`
- [ ] Implémenter `AnalysisService.analyze(userStory, llmConfig)`
- [ ] Calcul des scores et parsing robuste de la réponse JSON (avec fallbacks)
- [ ] Gestion du cache (si même US non modifiée dans les 24h → retourner l'analyse existante)
- [ ] Endpoint `POST /api/analyses` (déclenche l'analyse)
- [ ] Endpoint `GET /api/analyses/:id` (résultat)
- [ ] Écrire les tests unitaires `AnalysisService` (LLM mocké)

### Interface analyse (soirs + weekend semaine 6)
- [ ] Composant `AnalysisScore` (score global + jauges par dimension)
- [ ] Composant `SuggestionsList` (liste des suggestions priorisées)
- [ ] Composant `ImprovedVersion` (version améliorée affichée + bouton "Utiliser")
- [ ] Gestion des états : loading (spinner), succès, erreur, alerte US trop vague (< 40)
- [ ] Intégration dans la page détail US (le bouton "Analyser" est maintenant actif)

**✅ Fin Phase 3 : analyser une US depuis Jira et obtenir un score + suggestions. C'est déjà vendable.**

---

## Phase 4 — Génération de Tests Playwright (Semaines 7-8)

> Objectif : générer du code de test avec POM + fixtures depuis une US analysée

### Prompts de génération (soirs semaine 7)
- [ ] Écrire le prompt de génération (versionné `v1.0`) incluant :
  - Template POM attendu avec exemple
  - Template spec.ts attendu
  - Template fixtures.json attendu
  - Règles : `data-testid` en priorité, données dans fixtures, commentaires JSDoc
- [ ] Tester le prompt sur 5 US variées (connexion, formulaire, liste, modal, navigation)
- [ ] Valider que le code généré est syntaxiquement valide TypeScript
- [ ] Itérer sur le prompt pour améliorer la qualité POM

### Service de génération (weekend semaine 7)
- [ ] Migration DB : tables `generations` + `generated_files`
- [ ] Implémenter `GenerationService.generate(analysis, options, llmConfig)`
- [ ] Parsing des fichiers générés depuis la réponse JSON LLM
- [ ] Génération du ZIP en mémoire (`archiver` ou `jszip`)
- [ ] Endpoint `POST /api/generations`
- [ ] Endpoint `GET /api/generations/:id` (fichiers inclus)
- [ ] Endpoint `GET /api/generations/:id/download` (ZIP)
- [ ] Écrire les tests unitaires (LLM mocké, vérifier structure POM)

### Interface génération & visualisation (soirs + weekend semaine 8)
- [ ] Composant `CodeViewer` (onglets fichiers + coloration syntaxique Prism.js/Shiki)
- [ ] Bouton "Copier" par fichier
- [ ] Bouton "Télécharger ZIP" fonctionnel
- [ ] Page "Historique" (liste des générations avec filtres)
- [ ] Gestion état loading génération (stream ou polling selon durée)

**✅ Fin Phase 4 : pipeline complet US → analyse → génération → téléchargement. MVP fonctionnel.**

---

## Phase 5 — Auth, Équipes & Billing (Semaine 9)

> Objectif : multi-tenant fonctionnel + Stripe en mode test

### Auth & Équipes (soirs semaine 9)
- [ ] Migration DB : tables `team_members`, `invitations`
- [ ] Endpoint `POST /api/auth/register` (crée user + équipe + trial 14j)
- [ ] Middleware d'auth (`requireAuth`, `requireAdmin`) sur toutes les routes
- [ ] Isolation des données par `team_id` sur TOUTES les requêtes DB
- [ ] Endpoint `POST /api/teams/me/invitations` (envoyer une invitation par email)
- [ ] Endpoint `POST /api/auth/invite/accept` (accepter l'invitation)
- [ ] Interface : page "Membres de l'équipe" (liste + invitation)
- [ ] Interface : page "Paramètres équipe" (nom, config LLM, connexions)

### Billing Stripe (weekend semaine 9)
- [ ] Configurer Stripe (products + prices : Starter 49€/m, Pro 99€/m)
- [ ] Endpoint `POST /api/billing/checkout` (crée session Stripe Checkout)
- [ ] Endpoint `POST /api/billing/portal` (portail client)
- [ ] Endpoint `POST /api/webhooks/stripe` (update plan en DB sur events)
- [ ] Middleware de vérification du plan (bloquer les features Pro si plan Starter)
- [ ] Interface : page "Abonnement" (plan actuel + bouton upgrade)
- [ ] Tester le flow complet en mode test Stripe

**✅ Fin Phase 5 : app multi-tenant, inscriptions, invitations, paiement en mode test**

---

## Phase 6 — Polish & Démo Itecor (Semaine 10)

> Objectif : une démo irréprochable qui donne envie de s'inscrire sur-le-champ

### Qualité & robustesse (soirs semaine 10)
- [ ] Tests d'intégration sur les routes critiques (analyse + génération)
- [ ] Gestion des erreurs explicites côté UI (messages clairs, pas de crash silencieux)
- [ ] Vérifier la couverture de tests > 80% sur la logique métier
- [ ] Corriger tous les warnings TypeScript et ESLint
- [ ] Audit sécurité : pas de clé API dans les logs, isolation team_id vérifiée

### UX & polish (soirs semaine 10)
- [ ] Onboarding 3 étapes pour les nouveaux comptes (connexion → LLM → première analyse)
- [ ] États vides sur toutes les listes (premier usage guidé)
- [ ] Messages de loading avec estimation du temps (analyse, génération)
- [ ] Responsive basique (la démo se fera sur PC mais safe)
- [ ] Favicon + titre de page + meta description

### Préparation démo (weekend semaine 10)
- [ ] Créer un compte de démo avec de vraies US réalistes pré-chargées
- [ ] Préparer le script de démo (3 parcours : Sarah, Marc, Thomas)
- [ ] Tester la démo de bout en bout 3 fois sur l'environnement de production
- [ ] Préparer le slide de pricing (49€ / 99€ par équipe/mois)
- [ ] Créer la landing page minimale avec CTA "Rejoindre la beta" (Carrd ou équivalent)
- [ ] Configurer Stripe en mode live (paiements réels activés)

**✅ Fin Phase 6 : démo Itecor prête, landing page live, premiers abonnements possibles**

---

## Backlog v2 (post-démo)

Ces features sont hors périmètre v1 mais à planifier selon le retour des clients Itecor :

- [ ] Génération Selenium (Java + TypeScript)
- [ ] Writeback des US améliorées dans Jira/ADO
- [ ] Génération Cypress, TestCafe
- [ ] Provider LLM : Mistral (souveraineté données FR)
- [ ] Provider LLM : Ollama (on-premise)
- [ ] Analytics d'équipe (score moyen des US, évolution, time saved)
- [ ] Templates de POM personnalisables par équipe
- [ ] Intégration CI/CD directe (GitHub Actions, GitLab CI)
- [ ] Export des tests en pull request automatique
- [ ] Interface en anglais (i18n)

---

> 📊 Progression : 0 / 89 tâches complétées
> 🎯 Démo Itecor : début juin 2026
