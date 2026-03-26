# 🚀 Claude Code — Onboarding Guidé

> ```bash
> claude < specs/006-onboarding-flow/CLAUDE_TASK.md
> ```

---

## Contexte

TestForge a un `OnboardingBanner` existant dans `apps/frontend/src/components/onboarding/OnboardingBanner.tsx` qui détecte 3 étapes (connexion configurée, LLM configuré, première analyse faite). Il faut ajouter un wizard modal pour les nouveaux comptes — plus immersif que le banner, avec formulaires inline et animation confetti à la fin.

**Code existant clé :**
- `OnboardingBanner.tsx` : détecte via `api.get('/api/connections')` et `api.get('/api/llm-configs')` si les configs existent, + `localStorage.testforge_first_analysis`
- `ConnectionsPage.tsx` : formulaire complet de création de connexion (à simplifier pour le wizard)
- `LLMConfigPage.tsx` : formulaire complet LLM config
- APIs existantes : `POST /api/connections`, `POST /api/connections/:id/test`, `POST /api/llm-configs`, `POST /api/llm-configs/:id/test`, `POST /api/analyses`
- `AppLayout.tsx` : affiche déjà `<OnboardingBanner />` en haut du main content

**Aucune nouvelle route API.** Feature 100% frontend.

---

## Règles : TypeScript strict, test-first, pas de nouvelle dépendance, confetti en CSS pur

---

## TÂCHE 1 — Hook `useOnboardingState`

### Fichiers
- `apps/frontend/src/hooks/useOnboardingState.test.ts` (PREMIER)
- `apps/frontend/src/hooks/useOnboardingState.ts`

```typescript
interface OnboardingState {
  showWizard: boolean;      // true si première visite (pas de connexion ET pas de flag completed)
  hasConnection: boolean;
  hasLLM: boolean;
  hasFirstAnalysis: boolean;
  loading: boolean;
}

export function useOnboardingState(): OnboardingState {
  // Réutiliser EXACTEMENT la même logique que OnboardingBanner :
  // 1. Check localStorage.onboarding_completed → si true, showWizard = false
  // 2. Fetch /api/connections → hasConnection = connections.length > 0
  // 3. Fetch /api/llm-configs → hasLLM = configs.length > 0
  // 4. Check localStorage.testforge_first_analysis → hasFirstAnalysis
  // 5. showWizard = !onboarding_completed && (!hasConnection || !hasLLM || !hasFirstAnalysis)
}
```

---

## TÂCHE 2 — Formulaires inline simplifiés (3 étapes)

### `StepConnection.tsx`

Formulaire simplifié de `ConnectionsPage`. Champs requis uniquement :
- Type : `<select>` Jira Cloud / Azure DevOps
- Si Jira : URL base, email, API token, project key
- Si ADO : organization URL, project name, PAT
- Nom de la connexion (pré-rempli : "Mon projet Jira")
- Bouton "Tester la connexion" → `POST /api/connections/:id/test`
- Bouton "Sauvegarder" → `POST /api/connections`
- Callback `onComplete()` quand la connexion est créée avec succès

### `StepLLM.tsx`

Formulaire simplifié de `LLMConfigPage` :
- Provider : `<select>` OpenAI / Anthropic / Azure OpenAI
- Clé API : input password
- Modèle : input text (pré-rempli selon provider : `gpt-4o` pour OpenAI, `claude-sonnet-4-6` pour Anthropic)
- Bouton "Tester" → `POST /api/llm-configs/:id/test`
- Bouton "Sauvegarder" → `POST /api/llm-configs`
- Callback `onComplete()`

### `StepFirstAnalysis.tsx`

- Fetch les stories : `GET /api/user-stories?pageSize=5` (les 5 premières)
- Afficher les 5 stories comme boutons radio sélectionnables
- Bouton "Analyser cette US" → `POST /api/analyses { userStoryId }`
- Afficher le score quand terminé (réutiliser le composant `AnalysisScore` existant en version compacte)
- Callback `onComplete()`
- Set `localStorage.testforge_first_analysis = 'true'`

---

## TÂCHE 3 — `OnboardingWizard` + `ConfettiAnimation`

### `OnboardingWizard.tsx`

```tsx
// Modal overlay plein écran
// Header : "Bienvenue sur TestForge ! 🔧" + sous-titre
// Stepper : 3 dots (●/○) + "Étape X/3"
// Contenu : le composant Step actif
// Footer : [Passer] [← Précédent] [Suivant →]
// "Suivant" est désactivé tant que l'étape n'est pas complétée (sauf si "Passer" est cliqué)
// Après étape 3 complétée → écran de célébration
```

### `ConfettiAnimation.tsx`

```tsx
// 25 particules positionnées aléatoirement (CSS custom properties)
// @keyframes confetti-fall : translateY(-100vh → 100vh) + rotate + scale
// Durées variées : 1.5s à 3s
// Couleurs : vert, bleu, jaune, violet (couleurs TestForge)
// Auto-remove : le composant se démonte après 4s via setTimeout
// PAS de lib externe — juste des <div> avec style={{ '--delay': `${i * 0.1}s` }}
```

### Écran final

```tsx
// Après step 3 complétée :
<ConfettiAnimation />
<div className="text-center">
  <p className="text-5xl mb-4">🎉</p>
  <h2 className="text-xl font-semibold">TestForge est prêt !</h2>
  <p className="text-gray-500 mt-2">Votre première US a été analysée avec succès.</p>
  <button onClick={handleFinish} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg">
    Explorer mes User Stories →
  </button>
</div>
```

`handleFinish` : set `localStorage.onboarding_completed = 'true'` → navigate `/stories`

---

## TÂCHE 4 — Intégration dans AppLayout

### Modifier `apps/frontend/src/components/layout/AppLayout.tsx`

```tsx
import { OnboardingWizard } from '../onboarding/OnboardingWizard.js';
import { useOnboardingState } from '../../hooks/useOnboardingState.js';

export function AppLayout({ children }: AppLayoutProps) {
  const { showWizard } = useOnboardingState();
  // ...
  return (
    <div className="flex h-screen bg-gray-50">
      {showWizard && <OnboardingWizard onComplete={() => window.location.reload()} />}
      {/* sidebar + main inchangés */}
    </div>
  );
}
```

**⚠️ Le banner `<OnboardingBanner />` reste affiché tel quel** — il sert de fallback pour les utilisateurs qui ont passé le wizard mais n'ont pas terminé les 3 étapes.

---

## TÂCHE 5 — Vérification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
# Test manuel : créer un nouveau compte → wizard → 3 étapes → confetti → stories
```

---

## Fichiers : 8 à créer, 1 à modifier

> 📝 Specs : `specs/006-onboarding-flow/`
