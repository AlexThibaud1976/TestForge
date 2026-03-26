# Spécification — TestForge : Onboarding Guidé Amélioré

> Transformer le banner d'onboarding en parcours guidé interactif pour une démo fluide.
> Spécification détaillée — 2026-03-26

---

## 1. Vue d'Ensemble

### Problème

Un `OnboardingBanner` existe déjà dans `apps/frontend/src/components/onboarding/OnboardingBanner.tsx`. Il affiche 3 étapes (Connexion → LLM → Première analyse) en banner horizontal avec une barre de progression. C'est fonctionnel mais :
- Le banner est facile à ignorer (dismiss en un clic)
- Pas de guidance contextuelle sur chaque page de configuration
- Pas de célébration à la fin (pas de "wow, vous êtes prêt !")
- En démo, le présentateur doit naviguer manuellement entre les étapes

### Solution

Améliorer le parcours existant avec :
1. Un mode "première visite" qui affiche un wizard modal au lieu du banner pour les nouveaux comptes
2. Des tooltips contextuels sur les pages de configuration (pointant vers les champs importants)
3. Une animation de célébration quand les 3 étapes sont complétées
4. Le banner existant reste pour les utilisateurs qui ont dismissé le wizard (fallback)

### Périmètre

**Inclus :**
- Wizard modal 3 étapes au premier login (vérifié via `localStorage` ou absence de connexion configurée)
- Chaque étape guide vers l'action concrète (pas juste un lien — le formulaire est inline ou la page est ouverte)
- Étape 1 : Configurer une connexion Jira/ADO (formulaire inline simplifié)
- Étape 2 : Configurer le LLM (choix provider + clé API)
- Étape 3 : Lancer la première analyse (sélecteur de story + bouton "Analyser")
- Animation confetti/celebration à la fin + redirect vers le dashboard stories
- Le banner existant reste inchangé (fallback pour utilisateurs qui reviennent)

**Hors périmètre :**
- Réécriture du banner existant
- Tooltips sur chaque page (P2)
- Tour guidé produit complet (type Intercom)
- i18n du wizard

---

## 2. User Stories

#### US-1.1 : Wizard première visite

**En tant que** nouvel utilisateur (ou audience de démo), **je veux** être guidé étape par étape à mon premier login **afin de** configurer TestForge et voir ma première analyse en moins de 3 minutes.

**Critères d'acceptation :**
- [ ] Le wizard s'affiche en modal plein écran au premier login (pas de données en base)
- [ ] 3 étapes avec indicateur de progression (dots ou stepper)
- [ ] Navigation Précédent/Suivant + possibilité de "Passer" (skip)
- [ ] Chaque étape a un formulaire inline fonctionnel (pas juste un lien vers la page settings)
- [ ] L'étape est validée automatiquement quand la config est sauvée avec succès
- [ ] Si l'étape est déjà complétée (connexion existe déjà), elle est pré-cochée et skippable

#### US-1.2 : Célébration + redirect

**En tant que** nouvel utilisateur, **je veux** voir une animation de célébration après la 3e étape **afin de** sentir que la configuration est terminée et que je peux commencer à travailler.

**Critères d'acceptation :**
- [ ] Après l'analyse terminée, animation confetti (CSS pur, pas de lib)
- [ ] Message "🎉 TestForge est prêt ! Votre première US a été analysée."
- [ ] Bouton "Explorer mes User Stories →" qui redirige vers `/stories`
- [ ] Le wizard ne réapparaît plus (flag `onboarding_completed` en localStorage)

---

## 3. Wireframes

### Wizard modal (étape 1/3)

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           Bienvenue sur TestForge ! 🔧               │
│     Configurons votre espace en 3 étapes rapides     │
│                                                      │
│             ● ○ ○   Étape 1/3                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Connectez votre backlog                       │  │
│  │                                                │  │
│  │  Source :  [Jira Cloud ▾]                      │  │
│  │  URL :     [https://acme.atlassian.net    ]    │  │
│  │  Email :   [sophie@acme.com               ]    │  │
│  │  Token :   [••••••••••••                  ]    │  │
│  │  Projet :  [ACME                          ]    │  │
│  │                                                │  │
│  │            [Tester la connexion]               │  │
│  │            ✅ Connexion réussie !              │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│           [Passer]              [Suivant →]           │
└──────────────────────────────────────────────────────┘
```

---

## 4. Exigences Non-Fonctionnelles

| Catégorie | Exigence |
|-----------|----------|
| Performance | Le wizard s'affiche en < 500ms au premier login |
| UX | Animation confetti légère (CSS keyframes, pas de lib) |
| Accessibilité | Navigation clavier dans le wizard (Tab, Enter) |
| Pas de nouvelle dépendance | Tout en React + Tailwind + CSS animations |
| Rétrocompatibilité | Le banner existant `OnboardingBanner.tsx` reste inchangé |

---

> 📎 **Code existant :** `OnboardingBanner.tsx` détecte déjà si connexion/LLM/analyse existent. Réutiliser cette logique.
> 📎 **APIs existantes :** `POST /api/connections`, `POST /api/llm-configs`, `POST /api/analyses` — aucune nouvelle route.
