# Constitution — TestForge

> Version 1.0.0 — Mars 2026
> Principes non-négociables pour TestForge

---

## Mission

TestForge est un outil SaaS B2B qui transforme des user stories Jira ou Azure DevOps en tests automatisés Playwright/Selenium de qualité professionnelle. Il analyse et améliore les user stories avant de générer du code de test maintenable — avec POM, données externalisées et variables dynamiques — en s'intégrant nativement dans les workflows agile des équipes QA, dev et PO/PM.

---

## Principes Architecturaux Immuables

### 1. Stack & Runtime

- **Langage :** TypeScript strict (`"strict": true`) côté frontend ET backend. Aucun `any` implicite.
- **Frontend :** React + Vite (web app uniquement — pas d'app mobile v1)
- **Backend :** Node.js + Express — pas de framework fullstack lourd
- **LLM :** Couche d'abstraction multi-provider OBLIGATOIRE dès le premier commit. On ne couple jamais directement à OpenAI ou Claude API.
- **Base de données :** PostgreSQL via Supabase — une seule base, pas de db annexe
- **Runtime cible :** Node.js 20 LTS minimum

### 2. Architecture LLM

- **MUST** : Chaque appel LLM passe par un `LLMClient` interface unique — jamais d'appel direct SDK dans la logique métier
- **Providers supportés v1 :** OpenAI GPT-4o, Azure OpenAI, Claude API (Anthropic)
- **Providers v2 :** Mistral, Ollama (on-premise)
- **Le provider est configurable par équipe** — un client peut utiliser Azure OpenAI pour garder ses données dans son tenant

### 3. Qualité du Code Généré

- **C'est le différenciateur central du produit.** Les tests générés DOIVENT respecter :
  - Pattern Page Object Model (POM) — une classe par page/composant
  - Données de test externalisées (fichiers JSON/fixtures, jamais hardcodées)
  - Variables dynamiques — pas de chaînes fixes dans les sélecteurs critiques
  - Séparation test logic / test data
  - Commentaires explicatifs sur les décisions d'architecture
- **NEVER** générer du code "à plat" sans structure, même si l'US est simple

### 4. Distribution & Déploiement

- **Web app uniquement** — pas d'extension navigateur, pas d'app desktop en v1
- **Multi-tenant** — chaque équipe a son espace isolé (données, config LLM, templates)
- **Déploiement :** Railway (backend) + Vercel (frontend)
- **Environnements :** `development`, `staging`, `production`
- **NEVER** mettre des clés API en clair dans le code ou les logs

### 5. Sécurité & Données

- **Les user stories et le code généré appartiennent au client** — aucun usage à des fins d'entraînement
- **Clés API LLM** : stockées chiffrées (AES-256) en base, jamais en clair
- **Auth :** JWT + refresh tokens — session expire après 24h d'inactivité
- **RGPD :** données hébergées en Europe (région EU Supabase + Railway EU)
- **Logs :** aucune donnée métier (contenu des US, code généré) dans les logs applicatifs

### 6. Performance

- **Analyse d'une US :** < 10 secondes (LLM compris)
- **Génération d'un test :** < 30 secondes
- **Chargement de l'interface :** < 2 secondes
- **API response time (hors LLM) :** < 500ms p95

### 7. Qualité Interne

- **Couverture de tests :** > 80% sur la logique métier (abstraction LLM, parsers, générateurs)
- **Linting :** ESLint + Prettier — pas de PR mergée avec des erreurs lint
- **CI/CD :** GitHub Actions — lint + tests sur chaque PR, déploiement auto sur `main`
- **Commits :** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`)

---

## Validation Checklist (avant chaque release)

- [ ] La couche d'abstraction LLM fonctionne avec au moins 2 providers différents
- [ ] Le code généré respecte la structure POM + fixtures + données externalisées
- [ ] Aucune clé API n'apparaît dans les logs ou le code versionné
- [ ] Les données clients (US, tests) sont isolées par équipe en base
- [ ] Les tests automatisés passent en CI (lint + unit + integration)
- [ ] Le déploiement est reproductible depuis un environnement vierge

---

> ⚠️ Tout changement à ce document requiert une décision explicite du product owner (Alexandre).
