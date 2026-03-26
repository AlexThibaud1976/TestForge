# Plan Technique — Onboarding Guidé

> 2026-03-26

---

## Summary

Feature 100% frontend. Aucune nouvelle route API, aucune migration. Les APIs existantes (`POST /api/connections`, `POST /api/llm-configs`, `POST /api/analyses`) sont appelées directement depuis les formulaires inline du wizard. La logique de détection "première visite" existe déjà dans `OnboardingBanner.tsx` — on la réutilise.

---

## Architecture

### Nouveaux composants

| Composant | Fichier | Responsabilité |
|---|---|---|
| `OnboardingWizard` | `components/onboarding/OnboardingWizard.tsx` | Modal 3 étapes avec stepper |
| `StepConnection` | `components/onboarding/StepConnection.tsx` | Formulaire connexion inline (simplifié depuis `ConnectionsPage`) |
| `StepLLM` | `components/onboarding/StepLLM.tsx` | Formulaire LLM inline (simplifié depuis `LLMConfigPage`) |
| `StepFirstAnalysis` | `components/onboarding/StepFirstAnalysis.tsx` | Sélecteur de story + bouton analyser |
| `ConfettiAnimation` | `components/onboarding/ConfettiAnimation.tsx` | Animation CSS pure (keyframes) |
| `useOnboardingState` | `hooks/useOnboardingState.ts` | Détection première visite + progression des étapes |

### Composant modifié

| Fichier | Modification |
|---|---|
| `App.tsx` ou `AppLayout.tsx` | Afficher le wizard conditionnel au-dessus du contenu si première visite |

### Aucune API backend nouvelle

Les formulaires inline appellent les mêmes endpoints que les pages settings existantes. Les formulaires sont des versions simplifiées (moins de champs, UI plus guidée).

---

## Stratégie de Test

### Frontend (8 tests)

| Test | Description |
|---|---|
| `useOnboardingState should detect first visit` | Pas de connexion, pas de LLM → wizard ouvert |
| `should skip wizard if onboarding_completed in localStorage` | Flag existant → pas de wizard |
| `OnboardingWizard should render 3 steps with stepper` | DOM check |
| `should navigate between steps` | Clic Suivant/Précédent |
| `StepConnection should call POST /api/connections on submit` | Mock API |
| `StepLLM should call POST /api/llm-configs on submit` | Mock API |
| `StepFirstAnalysis should call POST /api/analyses on submit` | Mock API |
| `should show confetti and redirect after step 3` | Animation + navigation check |

---

## Fichiers : 8 à créer, 1 à modifier

```
apps/frontend/src/
├── components/onboarding/
│   ├── OnboardingWizard.tsx
│   ├── OnboardingWizard.test.tsx
│   ├── StepConnection.tsx
│   ├── StepLLM.tsx
│   ├── StepFirstAnalysis.tsx
│   └── ConfettiAnimation.tsx
├── hooks/
│   ├── useOnboardingState.ts
│   └── useOnboardingState.test.ts
```

Modifier : `apps/frontend/src/components/layout/AppLayout.tsx` (ou `App.tsx`) pour afficher le wizard conditionnel.

---

## Risques

| Risque | Mitigation |
|---|---|
| Le formulaire connexion simplifié oublie des champs requis | Reprendre exactement les mêmes champs Zod que `POST /api/connections` |
| Le wizard masque le contenu principal | Utiliser un modal overlay (z-50), pas un remplacement de route |
| Confetti trop lourde sur mobile | CSS keyframes uniquement, 20-30 particules max, auto-remove après 3s |
