# Spécification — TestForge v1.0

> Générez des tests automatisés de qualité professionnelle depuis vos user stories Jira et Azure DevOps.
> Spécification détaillée — Mars 2026

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Personas](#2-personas)
3. [Epics & User Stories](#3-epics--user-stories)
4. [Features Détaillées](#4-features-détaillées)
5. [Flux Utilisateur](#5-flux-utilisateur)
6. [Modèles de Données](#6-modèles-de-données)
7. [Wireframes](#7-wireframes)
8. [Exigences Non-Fonctionnelles](#8-exigences-non-fonctionnelles)

---

## 1. Vue d'Ensemble

### Problème

Les équipes de développement perdent un temps considérable à écrire des tests automatisés depuis leurs user stories. Les outils existants (GitHub Copilot, ChatGPT) génèrent du code qui "a l'air de fonctionner" mais qui est :
- Non maintenable (pas de POM, sélecteurs hardcodés)
- Non structuré (données de test dans le code, pas de fixtures)
- Basé sur des user stories souvent trop vagues pour produire des tests pertinents

En parallèle, les PO/PM écrivent des user stories insuffisamment précises (sans critères d'acceptance, sans edge cases), ce qui génère des ambiguïtés en phase de test.

Il n'existe pas d'outil accessible qui combine : analyse de la qualité des US + génération de tests maintenables avec architecture professionnelle + intégration Jira/ADO.

### Solution

TestForge est un pipeline en 3 étapes :
1. **Import** : connexion Jira ou Azure DevOps, lecture des user stories
2. **Analyse** : scoring de qualité de l'US + suggestions d'amélioration pour la testabilité
3. **Génération** : production de tests Playwright ou Selenium avec POM, fixtures, données externalisées

Le différenciateur central : **la qualité du code généré**, pas juste la vitesse de génération.

### Périmètre v1 (MVP — 10 semaines)

**Inclus :**
- Connexion Jira Cloud (API token)
- Connexion Azure DevOps (PAT)
- Analyse qualité d'une US avec score et suggestions
- Génération de tests Playwright (TypeScript)
- Architecture POM + fixtures + données externalisées
- Multi-provider LLM (OpenAI, Azure OpenAI, Claude)
- Interface web (dashboard équipe, historique)
- Auth (email/password + invitation équipe)
- Abonnement SaaS par équipe (Stripe)

**Hors périmètre v1 :**
- Génération Selenium (v2)
- Génération Cypress, TestCafe (v2)
- Exécution des tests dans TestForge
- Intégration CI/CD directe (GitHub Actions, GitLab CI)
- Mistral / Ollama (v2)
- Rapports et analytics d'équipe
- App mobile ou extension navigateur

---

## 2. Personas

### Persona 1 — Sarah (QA Engineer)

| | |
|---|---|
| **Profil** | 4 ans d'expérience QA, maîtrise Playwright, travaille en équipe Agile de 8 personnes |
| **Besoin principal** | Générer rapidement des tests maintenables depuis les US du sprint sans passer des heures à structurer le code |
| **Frustration** | Passe 30-40% de son temps à écrire du boilerplate de test. Le code généré par Copilot ne respecte jamais l'architecture de l'équipe |
| **Objectif** | Avoir des tests prêts à merger en moins d'une heure par US, avec une architecture que son équipe peut maintenir |
| **Fréquence d'usage** | Quotidien (chaque sprint) |

### Persona 2 — Marc (PO / Product Manager)

| | |
|---|---|
| **Profil** | PO depuis 6 ans, rédige les US dans Jira, peu technique, sensible à la qualité du backlog |
| **Besoin principal** | Savoir si ses US sont suffisamment précises pour être testées sans ambiguïté |
| **Frustration** | Découvre lors du sprint review que des scénarios n'ont pas été testés car l'US manquait de précision — retravail et friction avec l'équipe |
| **Objectif** | Valider la qualité de ses US avant le sprint planning, avec des suggestions concrètes d'amélioration |
| **Fréquence d'usage** | 2-3 fois par semaine (lors des refinements) |

### Persona 3 — Thomas (Tech Lead / Dev Senior)

| | |
|---|---|
| **Profil** | Dev senior en charge de la qualité du code, décide des outils de l'équipe, sensible aux coûts et à la maintenabilité |
| **Besoin principal** | Un outil qui génère du code de test qui respecte les standards de l'équipe, pas du code jetable |
| **Frustration** | Les tests générés par l'IA finissent systématiquement en dette technique — il faut les réécrire |
| **Objectif** | Réduire le temps passé en revue de code de test tout en maintenant les standards d'architecture |
| **Fréquence d'usage** | Hebdomadaire (validation, configuration LLM, templates) |

---

## 3. Epics & User Stories

### Epic 1 — Connexion aux sources de user stories

> Permettre à une équipe de connecter ses outils de gestion de projet pour importer ses user stories

#### US-1.1 : Connexion Jira Cloud

**En tant que** Thomas (Tech Lead), **je veux** connecter notre projet Jira à TestForge via un API token **afin de** pouvoir importer nos user stories sans copier-coller manuellement.

**Critères d'acceptation :**
- [ ] Formulaire de connexion avec champs : URL Jira, email, API token
- [ ] Validation de la connexion en temps réel (test ping) avant sauvegarde
- [ ] Sélection du ou des projets Jira à connecter
- [ ] Message d'erreur explicite si le token est invalide ou expiré
- [ ] La connexion est stockée de manière chiffrée par équipe

**Priorité :** 🔴 Haute

#### US-1.2 : Connexion Azure DevOps

**En tant que** Thomas, **je veux** connecter notre organisation Azure DevOps via un Personal Access Token **afin d'** importer les work items de type "User Story".

**Critères d'acceptation :**
- [ ] Formulaire : URL organisation ADO, projet, PAT
- [ ] Validation de connexion avant sauvegarde
- [ ] Sélection de l'itération (sprint) ou du backlog à connecter
- [ ] Support des champs standard ADO : Title, Description, Acceptance Criteria
- [ ] Message d'erreur si le PAT n'a pas les permissions suffisantes

**Priorité :** 🔴 Haute

#### US-1.3 : Import et navigation dans les user stories

**En tant que** Sarah (QA), **je veux** parcourir les user stories de mon projet connecté et en sélectionner une pour analyse **afin de** démarrer le workflow de génération de tests.

**Critères d'acceptation :**
- [ ] Liste des US avec titre, statut et assignee
- [ ] Filtres par sprint/itération, statut, assignee
- [ ] Recherche full-text sur le titre et la description
- [ ] Vue détaillée d'une US (titre, description, critères d'acceptance, labels)
- [ ] Bouton "Analyser cette US" visible depuis la vue détaillée

**Priorité :** 🔴 Haute

---

### Epic 2 — Analyse qualité des user stories

> Évaluer la testabilité des user stories et guider leur amélioration avant la génération de tests

#### US-2.1 : Score de qualité d'une US

**En tant que** Marc (PO), **je veux** obtenir un score de qualité sur ma user story **afin de** savoir si elle est suffisamment précise pour générer des tests pertinents.

**Critères d'acceptation :**
- [ ] Score global de 0 à 100 avec niveau (🔴 Faible / 🟡 Moyen / 🟢 Bon)
- [ ] Décomposition du score sur 5 dimensions : Clarté, Complétude, Testabilité, Edge cases, Critères d'acceptance
- [ ] Explication textuelle du score pour chaque dimension
- [ ] Temps d'analyse < 10 secondes
- [ ] Le score est mémorisé pour l'historique

**Priorité :** 🔴 Haute

#### US-2.2 : Suggestions d'amélioration de l'US

**En tant que** Marc, **je veux** recevoir des suggestions concrètes pour améliorer ma user story **afin de** la rendre plus précise et testable sans repartir de zéro.

**Critères d'acceptation :**
- [ ] Liste de suggestions avec priorité (critique / recommandé / optionnel)
- [ ] Chaque suggestion inclut : problème identifié + proposition de correction
- [ ] Suggestion de version améliorée de l'US complète (description + critères d'acceptance)
- [ ] Possibilité d'appliquer la version suggérée dans le formulaire (édition manuelle possible)
- [ ] La version améliorée n'est pas writeback dans Jira/ADO automatiquement (v1)

**Priorité :** 🔴 Haute

#### US-2.3 : Détection d'US trop vagues pour générer

**En tant que** Sarah, **je veux** être alertée quand une US est trop vague pour générer des tests utiles **afin de** ne pas perdre de temps sur une génération de mauvaise qualité.

**Critères d'acceptation :**
- [ ] Alerte visible si score < 40
- [ ] Message explicite listant ce qui manque (ex: "Pas de critères d'acceptance détectés")
- [ ] L'utilisateur peut quand même forcer la génération avec avertissement
- [ ] Suggestion de retourner vers Marc pour affiner l'US

**Priorité :** 🟡 Moyenne

---

### Epic 3 — Génération de tests automatisés

> Produire du code de test Playwright maintenable et prêt à l'usage depuis une user story analysée

#### US-3.1 : Génération de tests Playwright avec POM

**En tant que** Sarah, **je veux** générer des tests Playwright depuis une US analysée **afin d'** obtenir du code prêt à intégrer dans mon repo sans refactoring majeur.

**Critères d'acceptation :**
- [ ] Génération d'une classe Page Object (un fichier `.page.ts` par page impliquée)
- [ ] Génération du fichier de test (`.spec.ts`) qui utilise le POM
- [ ] Génération du fichier de fixtures (`fixtures/[feature].json`)
- [ ] Les sélecteurs utilisent des data-testid ou aria-label (pas de XPath fragiles)
- [ ] Les données de test (emails, noms, etc.) sont dans le fichier fixtures, jamais inline
- [ ] Le code inclut des commentaires expliquant les décisions d'architecture
- [ ] Temps de génération < 30 secondes

**Priorité :** 🔴 Haute

#### US-3.2 : Choix du provider LLM pour la génération

**En tant que** Thomas, **je veux** configurer quel provider LLM est utilisé pour mon équipe **afin de** respecter nos contraintes de sécurité (ex: données dans notre tenant Azure).

**Critères d'acceptation :**
- [ ] Sélection du provider : OpenAI / Azure OpenAI / Claude (Anthropic)
- [ ] Pour Azure OpenAI : champs endpoint, deployment name, API key
- [ ] Test de connexion du provider avant sauvegarde
- [ ] Le provider est configurable par équipe, pas par utilisateur
- [ ] Fallback configurable si le provider principal est indisponible

**Priorité :** 🔴 Haute

#### US-3.3 : Visualisation et téléchargement du code généré

**En tant que** Sarah, **je veux** visualiser le code généré avec coloration syntaxique et le télécharger en zip **afin de** l'intégrer facilement dans mon projet.

**Critères d'acceptation :**
- [ ] Vue en onglets : `*.page.ts`, `*.spec.ts`, `fixtures/*.json`
- [ ] Coloration syntaxique TypeScript
- [ ] Bouton "Copier" par fichier
- [ ] Bouton "Télécharger (ZIP)" pour l'ensemble des fichiers
- [ ] Structure du ZIP respecte les conventions Playwright (`tests/`, `pages/`, `fixtures/`)

**Priorité :** 🔴 Haute

#### US-3.4 : Historique des générations

**En tant que** Sarah, **je veux** retrouver les tests précédemment générés pour une US **afin de** comparer les versions ou récupérer du code sans relancer une génération.

**Critères d'acceptation :**
- [ ] Liste des générations avec date, US source, provider LLM utilisé
- [ ] Possibilité de re-visualiser et télécharger n'importe quelle génération passée
- [ ] Rétention : 90 jours
- [ ] Filtrage par projet / US / date

**Priorité :** 🟡 Moyenne

---

### Epic 4 — Gestion d'équipe & Abonnement

> Permettre à une équipe de s'inscrire, d'inviter des membres et de gérer son abonnement

#### US-4.1 : Inscription et création d'équipe

**En tant que** Thomas, **je veux** créer un compte TestForge pour mon équipe **afin de** centraliser les connexions et les configurations dans un espace partagé.

**Critères d'acceptation :**
- [ ] Inscription email/password avec vérification email
- [ ] Création d'un espace équipe (nom + taille indicative)
- [ ] Onboarding en 3 étapes : connexion source (Jira/ADO) → config LLM → première analyse
- [ ] Trial gratuit 14 jours sans CB

**Priorité :** 🔴 Haute

#### US-4.2 : Invitation de membres

**En tant que** Thomas, **je veux** inviter Sarah et Marc à rejoindre l'espace équipe **afin que** chacun puisse utiliser TestForge avec ses propres accès.

**Critères d'acceptation :**
- [ ] Invitation par email
- [ ] Rôles : Admin (configure LLM, connexions) / Member (analyse + génère)
- [ ] L'invité reçoit un lien valable 7 jours
- [ ] Limite de membres selon le plan

**Priorité :** 🟡 Moyenne

#### US-4.3 : Abonnement et paiement

**En tant que** Thomas, **je veux** souscrire à un plan payant **afin de** continuer à utiliser TestForge après la période de trial.

**Critères d'acceptation :**
- [ ] Plan Starter : 49€/mois — jusqu'à 5 membres, OpenAI uniquement, historique 30 jours
- [ ] Plan Pro : 99€/mois — membres illimités, tous providers LLM, historique 90 jours
- [ ] Paiement par carte via Stripe Checkout
- [ ] Factures accessibles dans l'interface
- [ ] Downgrade / résiliation possible à tout moment

**Priorité :** 🔴 Haute

---

## 4. Features Détaillées

### F1 — Moteur d'analyse qualité des US

**Description :** Analyse NLP + LLM d'une user story en 5 dimensions. L'US est envoyée au LLM avec un prompt structuré qui demande une réponse JSON avec scores et suggestions. Le résultat est mis en cache 24h pour éviter de repayer des tokens sur la même US non modifiée.

**Entrées :** Texte de l'US (titre + description + critères d'acceptance)

**Sorties :** Score JSON `{global: 72, dimensions: {...}, suggestions: [...], improvedVersion: "..."}`

**Règles métier :**
- Score < 40 → alerte rouge, génération déconseillée
- Score 40-70 → avertissement, génération possible
- Score > 70 → génération recommandée
- La version "améliorée" suggérée est toujours générée, même si score > 70

**Cas limites :**
- US en français → analyse en français, code généré en anglais (convention standard)
- US sans description (titre seul) → score max 20, suggestion d'ajouter une description
- US très longue (> 2000 chars) → troncature intelligente avec avertissement

### F2 — Générateur de tests avec architecture POM

**Description :** À partir d'une US (originale ou version améliorée), génère un ensemble de fichiers TypeScript structurés. Le prompt LLM inclut un template de structure attendue et des exemples de bonne architecture. Le LLM retourne un JSON avec les fichiers et leur contenu.

**Entrées :** Texte de l'US (analysé), framework cible (Playwright v1), provider LLM sélectionné

**Sorties :** 3 fichiers minimum :
- `pages/[FeatureName].page.ts` — classe POM avec locators et méthodes
- `tests/[featureName].spec.ts` — fichier de test utilisant le POM
- `fixtures/[featureName].json` — données de test externalisées

**Règles métier :**
- Les locators DOIVENT utiliser `data-testid` ou `role` en priorité
- Les données de test (valeurs, credentials, textes) DOIVENT être dans fixtures
- Chaque méthode POM DOIT avoir un commentaire JSDoc
- Le fichier spec DOIT couvrir le happy path + au moins 2 cas d'erreur identifiés dans l'US

**Cas limites :**
- US impliquant plusieurs pages → un fichier POM par page détectée
- US sans critères d'acceptance → génération du happy path uniquement + commentaire d'avertissement dans le code
- Timeout LLM → retry 1 fois, puis erreur utilisateur avec message explicite

### F3 — Couche d'abstraction LLM

**Description :** Interface TypeScript uniforme `LLMClient` avec méthodes `analyze()` et `generate()`. Chaque provider (OpenAI, Azure OpenAI, Claude) implémente cette interface via un adaptateur. La sélection du provider est résolue à l'exécution selon la config de l'équipe.

**Règles métier :**
- Tous les prompts sont versionés (stockés en base avec la génération)
- Le modèle utilisé est loggué par génération (pour débogage et facturation future)
- Si Azure OpenAI est sélectionné, TOUTES les requêtes passent par l'endpoint Azure du client

---

## 5. Flux Utilisateur

### Flux principal — Première génération de test

1. Thomas crée un compte → crée l'espace équipe "Acme QA"
2. Thomas connecte Jira (URL + API token) → validation → projet sélectionné
3. Thomas configure le provider LLM (Azure OpenAI) → test de connexion → sauvegarde
4. Thomas invite Sarah et Marc par email
5. Sarah se connecte → voit le dashboard avec les US du sprint en cours
6. Sarah sélectionne l'US "US-42 : Connexion utilisateur"
7. Sarah clique "Analyser" → score 65/100 affiché en 8 secondes
8. Sarah lit les suggestions → décide d'utiliser la version améliorée suggérée
9. Sarah clique "Générer les tests" → 25 secondes de génération
10. Sarah visualise les 3 fichiers générés → télécharge le ZIP
11. **Résultat :** Sarah merge les tests dans son repo en 15 minutes au lieu de 2h

### Flux alternatif — US trop vague

1. Marc analyse son US "US-17 : Améliorer le profil"
2. Score : 28/100 — alerte rouge
3. TestForge liste : "Pas de critères d'acceptance, action attendue non précisée, aucun edge case"
4. TestForge propose une version améliorée complète
5. Marc copie la suggestion → retourne dans Jira → met à jour son US
6. Marc re-analyse depuis TestForge → score 78/100
7. **Résultat :** Marc évite un sprint review raté grâce à une US précise

### Flux alternatif — Changement de provider LLM

1. Thomas va dans Paramètres équipe → LLM
2. Sélectionne Azure OpenAI → entre endpoint + deployment + clé
3. Clique "Tester la connexion" → succès
4. Sauvegarde → toutes les prochaines générations de l'équipe passent par Azure

---

## 6. Modèles de Données

```typescript
interface Team {
  id: string;
  name: string;
  plan: 'trial' | 'starter' | 'pro';
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

interface SourceConnection {
  id: string;
  teamId: string;
  type: 'jira' | 'azure_devops';
  name: string;                    // Nom affiché (ex: "Jira Acme")
  baseUrl: string;
  encryptedCredentials: string;   // AES-256 chiffré
  projectKey: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
}

interface LLMConfig {
  id: string;
  teamId: string;
  provider: 'openai' | 'azure_openai' | 'anthropic';
  model: string;                   // ex: 'gpt-4o', 'claude-3-5-sonnet'
  encryptedApiKey: string;
  azureEndpoint: string | null;   // Azure uniquement
  azureDeployment: string | null; // Azure uniquement
  isDefault: boolean;
  createdAt: Date;
}

interface UserStory {
  id: string;
  teamId: string;
  connectionId: string;
  externalId: string;             // ID dans Jira / ADO
  title: string;
  description: string;
  acceptanceCriteria: string | null;
  labels: string[];
  status: string;
  fetchedAt: Date;
}

interface Analysis {
  id: string;
  userStoryId: string;
  teamId: string;
  scoreGlobal: number;            // 0-100
  scoreClarity: number;
  scoreCompleteness: number;
  scoreTestability: number;
  scoreEdgeCases: number;
  scoreAcceptanceCriteria: number;
  suggestions: AnalysisSuggestion[];
  improvedVersion: string | null;
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  createdAt: Date;
}

interface AnalysisSuggestion {
  priority: 'critical' | 'recommended' | 'optional';
  issue: string;
  suggestion: string;
}

interface Generation {
  id: string;
  analysisId: string;
  teamId: string;
  framework: 'playwright';        // Selenium en v2
  language: 'typescript';
  llmProvider: string;
  llmModel: string;
  promptVersion: string;
  files: GeneratedFile[];
  status: 'pending' | 'success' | 'error';
  errorMessage: string | null;
  durationMs: number;
  createdAt: Date;
}

interface GeneratedFile {
  type: 'page_object' | 'test_spec' | 'fixtures';
  filename: string;               // ex: "pages/Login.page.ts"
  content: string;
}
```

---

## 7. Wireframes

### Dashboard principal

```
┌─────────────────────────────────────────────────────────────┐
│  🔧 TestForge    [Acme QA ▾]              [Sarah ▾]  [?]   │
├──────────────┬──────────────────────────────────────────────┤
│              │  Sprint 24 — 12 user stories                 │
│  📋 US       │ ┌──────────────────────────────────────────┐ │
│  🕐 Historique│ │ 🔍 Rechercher...        [Filtres ▾]     │ │
│  ⚙️ Paramètres│ ├──────────────────────────────────────────┤ │
│              │ │ US-42  Connexion utilisateur    🟢 78    │ │
│              │ │ US-17  Améliorer le profil      🔴 28    │ │
│              │ │ US-51  Réinitialiser mdp         —       │ │
│              │ │ US-33  Modifier email            —       │ │
│              │ └──────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

### Vue analyse d'une US

```
┌─────────────────────────────────────────────────────────────┐
│  ← Retour   US-42 : Connexion utilisateur                   │
├─────────────────────────────┬───────────────────────────────┤
│  US ORIGINALE               │  ANALYSE                      │
│ ┌─────────────────────────┐ │  Score global : 65/100 🟡     │
│ │ En tant qu'utilisateur  │ │                               │
│ │ je veux me connecter... │ │  Clarté            ████░  72 │
│ │                         │ │  Complétude        ███░░  58 │
│ └─────────────────────────┘ │  Testabilité       ████░  70 │
│                             │  Edge cases        ██░░░  40 │
│  [Utiliser version améliorée│  Critères accept.  ████░  75 │
│   suggérée ↓]               │                               │
│                             │  ⚠️ Suggestions (3)           │
│  VERSION AMÉLIORÉE          │  • Ajouter cas email invalide │
│ ┌─────────────────────────┐ │  • Préciser comportement verr.│
│ │ En tant qu'utilisateur  │ │  • Mentionner timeout session │
│ │ connecté, je veux...    │ │                               │
│ │ [éditable]              │ │  [Générer les tests →]        │
│ └─────────────────────────┘ │                               │
└─────────────────────────────┴───────────────────────────────┘
```

### Vue code généré

```
┌─────────────────────────────────────────────────────────────┐
│  ← Retour   Tests générés — US-42   [⬇ Télécharger ZIP]    │
├─────────────────────────────────────────────────────────────┤
│  [Login.page.ts] [login.spec.ts] [fixtures/login.json]      │
├─────────────────────────────────────────────────────────────┤
│  1  import { Page, Locator } from '@playwright/test';       │
│  2                                                           │
│  3  /**                                                      │
│  4   * Page Object for Login page                           │
│  5   * Generated by TestForge from US-42                    │
│  6   */                                                      │
│  7  export class LoginPage {                                 │
│  8    private page: Page;                                    │
│  9    readonly emailInput: Locator;                          │
│ 10    ...                                              [Copy]│
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Analyse US < 10s, génération tests < 30s, chargement UI < 2s |
| Disponibilité | 99.5% uptime hors maintenance planifiée |
| Internationalisation | Interface en français v1, anglais v2 |
| Navigateurs | Chrome, Firefox, Edge (2 dernières versions) |
| Accessibilité | WCAG 2.1 AA sur les éléments interactifs principaux |
| RGPD | Données hébergées EU, politique de confidentialité, droit à l'effacement |
| Scalabilité | Conçu pour 100 équipes sans changement d'architecture |
