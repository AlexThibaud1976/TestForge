# Spec — TestForge Jira Forge Extension
**Version:** 1.0.0
**Date:** 2026-03-29
**Feature branch:** `012-jira-forge-extension`
**Voir aussi:** constitution.md, plan.md, tasks.md

---

## 1. Vue d'ensemble

### Problème

Les POs et QA passent leur journée dans Jira. Leur demander de passer dans un autre outil pour savoir si une US est "testable" crée de la friction. La valeur de TestForge est souvent découverte trop tard dans le cycle — après que les US aient déjà été mal rédigées.

### Valeur proposée

Un panel TestForge directement dans chaque issue Jira qui :
- Pour un **non-client** : montre instantanément un score de testabilité heuristique avec des suggestions concrètes → suscite l'envie d'aller plus loin sur TestForge.
- Pour un **client existant** : affiche le score LLM complet issu de TestForge, avec toutes les dimensions, et permet d'accéder en un clic à la génération de tests.

### Objectif démo juin 2026

Montrer à l'audience Itecor que TestForge n'est pas une app isolée mais une extension naturelle de leur workflow Jira — l'effet "wow" d'intégration.

---

## 2. Personas

### Persona A — Marc (Product Owner, non-client TestForge)

| | |
|---|---|
| **Profil** | PO depuis 6 ans, écrit des dizaines d'US par sprint, utilise Jira quotidiennement |
| **Besoin** | Savoir si ses US sont assez précises pour être testées, sans changer d'outil |
| **Frustration** | Apprend que ses US sont "non testables" lors du sprint planning, trop tard |
| **Objectif dans l'extension** | Voir le score immédiatement en rédigeant l'issue, corriger avant le planning |

### Persona B — Sophie (QA Lead, cliente TestForge)

| | |
|---|---|
| **Profil** | QA Lead, utilise TestForge pour générer des tests Playwright, revient souvent dans Jira pour référencer les US |
| **Besoin** | Savoir depuis Jira si une US a déjà été analysée et si le score est suffisant pour générer |
| **Frustration** | Doit aller dans TestForge, rechercher l'US, vérifier le score — trois clics de trop |
| **Objectif dans l'extension** | Un statut immédiat + un lien direct vers la génération |

---

## 3. Epics & User Stories

### Epic 1 — Mode Anonyme (Non-client)

**US-01** — En tant que PO non-client, je veux voir un score de testabilité heuristique de mon US directement dans Jira, afin de savoir immédiatement si elle est suffisamment bien rédigée.

Critères d'acceptation :
- Un panel "TestForge Score" est visible dans chaque issue de type Story/Epic/Task
- Le score heuristique (0–100) est calculé en < 2s sans LLM
- Le panel affiche 3 dimensions : Clarté, Critères d'acceptance, Données de test
- Le panel affiche 2–3 suggestions textuelles concrètes
- Un CTA "Analyser avec l'IA complète → TestForge" est visible avec le lien vers l'app
- Aucun compte n'est requis pour voir ce score

**US-02** — En tant que PO non-client, je veux voir une invitation claire à essayer TestForge gratuitement, afin de comprendre la valeur supplémentaire disponible.

Critères d'acceptation :
- Un encart "Score IA complet — 5 dimensions" est affiché en dessous du score heuristique
- L'encart contient un lien "Essayer TestForge gratuitement →" vers la landing page
- L'encart est discret (pas de pop-up, pas d'overlay)

---

### Epic 2 — Connexion du compte TestForge

**US-03** — En tant qu'utilisateur TestForge, je veux connecter mon compte TestForge à l'extension Jira via un token API, afin d'accéder au score LLM complet directement dans Jira.

Critères d'acceptation :
- Un bouton "Connecter TestForge" est visible en mode anonyme
- Un formulaire d'entrée de token s'ouvre en cliquant sur ce bouton
- Le token est validé en temps réel contre le backend TestForge (`POST /api/jira-panel/token/validate`)
- En cas de succès, le panel bascule immédiatement en mode authentifié
- Le token est stocké via Forge Storage API (persistant entre sessions)
- Un bouton "Déconnecter" permet de supprimer le token

**US-04** — En tant qu'admin TestForge, je veux générer et gérer des API tokens pour mon équipe, afin de pouvoir connecter l'extension Jira.

Critères d'acceptation :
- Dans TestForge Settings, une section "API Tokens" permet de générer un token nommé
- Un token généré est affiché une seule fois (doit être copié)
- Les tokens sont listés (nom, date création, dernière utilisation)
- Un token peut être révoqué à tout moment
- Un token révoqué désactive immédiatement l'extension Jira associée

---

### Epic 3 — Mode Authentifié (Client TestForge)

**US-05** — En tant que cliente TestForge authentifiée, je veux voir le score LLM complet de l'US directement dans Jira, afin d'éviter d'avoir à ouvrir TestForge pour vérifier le statut.

Critères d'acceptation :
- Le panel affiche le score global + les 5 dimensions (Clarté, Critères d'acceptance, Données de test, Indépendance, Taille)
- Si l'US a déjà été analysée dans TestForge, le score en cache est retourné instantanément
- Si l'US n'a jamais été analysée, un bouton "Analyser maintenant (IA)" est proposé
- Le score affiché est identique à celui visible dans TestForge (source unique : DB TestForge)
- La date de la dernière analyse est affichée

**US-06** — En tant que QA Lead authentifiée, je veux accéder en un clic à la génération de tests pour cette US dans TestForge, afin d'éviter la recherche manuelle dans l'app.

Critères d'acceptation :
- Un bouton "Générer les tests →" redirige vers TestForge, sur l'US correspondante
- Le deep-link contient le `issueKey` et l'URL Jira pour pré-sélectionner l'US
- Le bouton est désactivé (avec message) si le score est < 50 ("US à améliorer avant de générer")
- Le bouton est actif si l'US a été analysée et score ≥ 50

**US-07** — En tant que cliente TestForge authentifiée, je veux déclencher une analyse LLM depuis le panel Jira, afin d'analyser une US non encore traitée sans quitter Jira.

Critères d'acceptation :
- Un bouton "Analyser maintenant" déclenche un appel `POST /api/jira-panel/analyze`
- Un indicateur de progression est affiché pendant l'analyse (spinner + étapes : Préparation / Appel LLM / Finalisation)
- Le score s'affiche automatiquement une fois l'analyse terminée
- En cas d'erreur (LLM timeout, crédit épuisé), un message d'erreur clair est affiché

---

### Epic 4 — UX & Qualité Démo

**US-08** — En tant qu'utilisateur, je veux que le panel soit esthétiquement cohérent avec TestForge et professionnel, afin de renforcer la confiance dans le produit.

Critères d'acceptation :
- Design cohérent avec les couleurs TestForge (bleu primaire, dégradés, typographie)
- Visualisation du score : jauge circulaire ou barre colorée (vert/jaune/rouge selon seuils)
- Responsive dans le panel Jira (largeur variable : ~300–450px)
- Aucun scroll horizontal

---

## 4. Flux utilisateur

### Flux 1 — Découverte (Non-client)

```
1. PO ouvre une issue Jira (Story)
2. Panel "TestForge" visible dans la sidebar
3. Score heuristique chargé en < 2s (ex: 62/100, "À améliorer")
4. 2 suggestions affichées : "Ajouter des critères d'acceptance", "Préciser les données de test"
5. Encart discret : "Score IA complet disponible sur TestForge"
6. PO clique "Essayer gratuitement" → landing page TestForge
```

### Flux 2 — Connexion compte

```
1. Utilisateur dans TestForge : Settings → API Tokens → Générer token "Jira Extension"
2. Copie le token
3. Retour dans Jira, panel TestForge → "Connecter TestForge"
4. Colle le token → Valider
5. Panel bascule en mode authentifié
6. Score LLM complet affiché (ou "Analyser maintenant" si pas encore analysée)
```

### Flux 3 — Usage quotidien (Client)

```
1. QA Lead ouvre une issue Jira
2. Panel authentifié : score 78/100, "Prête"
3. Voir les 5 dimensions en détail
4. Clic "Générer les tests →" → ouvre TestForge sur l'US, pré-sélectionnée
5. Lance la génération dans TestForge
```

---

## 5. Wireframes

### Mode anonyme

```
┌─────────────────────────────────────┐
│ 🔷 TestForge Score                  │
│─────────────────────────────────────│
│        ╔═══════╗                    │
│        ║  62   ║  Score heuristique │
│        ╚═══════╝                    │
│  🟡 À améliorer                     │
│                                     │
│  Clarté              ████░░  68     │
│  Critères accept.    ███░░░  52     │
│  Données de test     ██░░░░  38     │
│                                     │
│  💡 Suggestions :                   │
│  • Ajouter des critères d'acceptance│
│  • Préciser les données de test     │
│                                     │
│ ─────────────────────────────────── │
│  🤖 Score IA complet — 5 dimensions │
│  [Connecter TestForge]              │
│  [Essayer gratuitement →]           │
└─────────────────────────────────────┘
```

### Mode authentifié (US analysée)

```
┌─────────────────────────────────────┐
│ 🔷 TestForge Score  ✅ Connecté     │
│─────────────────────────────────────│
│        ╔═══════╗                    │
│        ║  78   ║  Score LLM         │
│        ╚═══════╝  Analysé 14/03     │
│  🟢 Prête pour les tests            │
│                                     │
│  Clarté              █████░  82     │
│  Critères accept.    ████░░  76     │
│  Données de test     ████░░  72     │
│  Indépendance        █████░  88     │
│  Taille              ███░░░  60     │
│                                     │
│  [↗ Générer les tests dans TestForge]│
│  [🔄 Ré-analyser]   [Déconnecter]   │
└─────────────────────────────────────┘
```

### Mode authentifié (US non encore analysée)

```
┌─────────────────────────────────────┐
│ 🔷 TestForge Score  ✅ Connecté     │
│─────────────────────────────────────│
│  ⚪ Non analysée                    │
│                                     │
│  Cette user story n'a pas encore    │
│  été analysée par TestForge.        │
│                                     │
│  [🤖 Analyser maintenant]           │
│                                     │
│  [↗ Ouvrir dans TestForge]          │
└─────────────────────────────────────┘
```

---

## 6. Modèles de données (perspective fonctionnelle)

```typescript
// Score retourné par le backend
interface JiraPanelScore {
  mode: 'heuristic' | 'llm';
  score: number;            // 0–100
  level: 'critical' | 'needs_improvement' | 'ready';
  dimensions: {
    clarity: number;
    acceptanceCriteria: number;
    testData: number;
    independence?: number;  // LLM only
    size?: number;          // LLM only
  };
  suggestions: string[];    // 2–3 items
  analyzedAt?: string;      // ISO date, LLM mode only
  testforgeUrl?: string;    // deep-link vers l'US dans TestForge
}

// Token API (côté TestForge DB)
interface ApiToken {
  id: string;
  teamId: string;
  name: string;
  tokenHash: string;        // SHA-256 du token, jamais le token en clair
  lastUsedAt?: string;
  createdAt: string;
  revokedAt?: string;
}
```
