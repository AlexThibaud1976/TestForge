# Feature Specification: Code Validation & Self-Healing

**Feature Branch**: `004-code-validation`
**Created**: 2026-03-25
**Status**: Draft

---

## Résumé

Valider syntaxiquement le code TypeScript/JavaScript généré avant de le retourner à l'utilisateur. En cas d'erreur de compilation, relancer automatiquement le LLM avec le message d'erreur pour corriger le code (self-healing loop, max 2 retries). L'utilisateur reçoit toujours du code qui compile.

### Problème

Le code généré par le LLM est parsé comme JSON (structure des fichiers) mais jamais compilé ni vérifié. Il arrive que le code contienne des imports manquants, des types incorrects, des erreurs de syntaxe, ou des appels Playwright inexistants. L'utilisateur découvre les erreurs dans son IDE, ce qui détruit la confiance dans l'outil.

### Solution

Après le parsing JSON des fichiers générés, exécuter un `ts.transpileModule()` (TypeScript compiler API) sur chaque fichier `.ts`. Si des erreurs sont détectées, renvoyer le code + les messages d'erreur au LLM pour correction automatique. Maximum 2 tentatives de correction. Si ça échoue toujours, retourner le code avec un warning "erreurs de compilation détectées".

---

## User Stories

### US-CV-1 — Validation automatique du code généré (Priority: P1)

Sarah génère des tests pour une US. Le code retourné a été vérifié syntaxiquement — pas d'erreurs de compilation TypeScript. Si des erreurs existaient, elles ont été corrigées automatiquement.

**Independent Test**: Générer des tests → vérifier que le code compile sans erreur via `ts.transpileModule()`.

**Acceptance Scenarios**:

1. **Given** une génération lancée, **When** le LLM retourne du code valide, **Then** le code passe la validation et est retourné normalement (pas de ralentissement perceptible).
2. **Given** le LLM retourne du code avec un import manquant, **When** la validation détecte l'erreur, **Then** le code + l'erreur sont renvoyés au LLM, le code corrigé est retourné à l'utilisateur.
3. **Given** 2 tentatives de correction échouent, **When** le code ne compile toujours pas, **Then** le code est retourné avec un badge "⚠️ Erreurs de compilation détectées" et la liste des erreurs.
4. **Given** un fichier de fixtures JSON, **When** la validation s'exécute, **Then** seul le JSON est validé (JSON.parse), pas de transpilation TS.

---

### US-CV-2 — Indicateur de qualité du code (Priority: P2)

Sarah voit un indicateur de qualité sur chaque génération : "Code validé ✓" (vert), "Corrigé automatiquement" (orange), "Erreurs détectées" (rouge).

**Independent Test**: Générer des tests avec un LLM qui produit du code invalide → vérifier le badge de statut.

**Acceptance Scenarios**:

1. **Given** le code a passé la validation du premier coup, **Then** le badge est "Code validé ✓" (vert).
2. **Given** le code a nécessité 1-2 corrections, **Then** le badge est "Corrigé automatiquement" (orange) avec le nombre de corrections.
3. **Given** le code n'a pas pu être corrigé, **Then** le badge est "Erreurs détectées" (rouge) avec la liste des erreurs affichable.

---

## Edge Cases

- Code Python ou Java → pas de transpilation TS, utiliser un linter basique ou regex validation
- Code très long dépassant le context window du LLM sur le retry → tronquer les erreurs aux 5 plus critiques
- Fichier POM qui importe le fichier fixtures → la validation doit être fichier par fichier (pas d'import resolution cross-file)

---

## Requirements

- **FR-CV-001**: Le système DOIT valider syntaxiquement chaque fichier TypeScript/JavaScript généré via `ts.transpileModule()`.
- **FR-CV-002**: Les fichiers JSON (fixtures) DOIVENT être validés via `JSON.parse()`.
- **FR-CV-003**: En cas d'erreur, le système DOIT relancer le LLM avec le code + erreurs (max 2 retries).
- **FR-CV-004**: Le prompt de correction DOIT inclure : le code original, les messages d'erreur exacts, et l'instruction de corriger uniquement les erreurs.
- **FR-CV-005**: Le statut de validation DOIT être persisté sur la génération (valid, auto_corrected, has_errors).
- **FR-CV-006**: Le nombre de corrections et les erreurs résiduelles DOIVENT être stockés pour analytics.
- **FR-CV-007**: La validation NE DOIT PAS ajouter plus de 5 secondes au temps de génération (hors retry LLM).
- **Performance**: validation TS < 2s par fichier, retry LLM < 15s par tentative.
- **Plan**: disponible sur Starter et Pro.
