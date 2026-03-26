# Checklist — Onboarding Guidé

> Estimation : ~4h | Prérequis : aucun

---

## Phase 1 : Hook + détection première visite (0.5h)

- [ ] T001 Écrire 2 tests pour `useOnboardingState` (RED)
- [ ] T002 Créer `hooks/useOnboardingState.ts` : détecte si connexion/LLM existent (réutiliser logique `OnboardingBanner`), check `localStorage.onboarding_completed`
- [ ] T003 Vérifier GREEN

---

## Phase 2 : Formulaires inline des 3 étapes — Test-First (1.5h)

- [ ] T004 Écrire test : `StepConnection should call POST /api/connections` (RED)
- [ ] T005 Créer `StepConnection.tsx` : formulaire simplifié (type, URL, credentials, project key, bouton "Tester")
- [ ] T006 Écrire test : `StepLLM should call POST /api/llm-configs` (RED)
- [ ] T007 Créer `StepLLM.tsx` : choix provider (select), clé API, modèle, bouton "Tester"
- [ ] T008 Écrire test : `StepFirstAnalysis should call POST /api/analyses` (RED)
- [ ] T009 Créer `StepFirstAnalysis.tsx` : sélecteur de story (fetch depuis `/api/user-stories?pageSize=5`), bouton "Analyser", affiche le score quand terminé
- [ ] T010 Vérifier GREEN pour les 3 composants

---

## Phase 3 : Wizard modal + confetti — Test-First (1.5h)

- [ ] T011 Écrire 2 tests pour `OnboardingWizard` (stepper, navigation) (RED)
- [ ] T012 Créer `OnboardingWizard.tsx` : modal overlay, stepper dots, Précédent/Suivant/Passer, intègre les 3 steps
- [ ] T013 Créer `ConfettiAnimation.tsx` : 20-30 particules CSS (`@keyframes fall` + random positions), auto-remove après 3s
- [ ] T014 Écran final : "🎉 TestForge est prêt !" + bouton "Explorer mes User Stories →"
- [ ] T015 Set `localStorage.onboarding_completed = 'true'` à la fermeture
- [ ] T016 Vérifier GREEN

---

## Phase 4 : Intégration + Polish (0.5h)

- [ ] T017 Intégrer `OnboardingWizard` dans `AppLayout.tsx` : affiché conditionnel si `useOnboardingState().showWizard`
- [ ] T018 Vérifier que le banner existant reste inchangé (non-régression)
- [ ] T019 Test manuel : nouveau compte → wizard → 3 étapes → confetti → stories
- [ ] T020 `pnpm typecheck && pnpm lint && pnpm test`
- [ ] T021 Mettre à jour le User Guide

---

> 📊 Progression : 0 / 21 tâches | ~4h estimées
