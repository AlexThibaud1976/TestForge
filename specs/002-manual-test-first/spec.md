# Feature Specification: Manual Test First

**Feature Branch**: `002-manual-test-first`
**Created**: 2026-03-25
**Status**: Draft
**Author**: Alexandre

---

## Résumé

Ajouter une étape intermédiaire au pipeline TestForge : **générer des tests manuels structurés** (Xray / ADO Test Plans) depuis les critères d'acceptance, les faire valider par le QA/PO, puis injecter les IDs des tests manuels validés dans le code des tests automatisés pour garantir une traçabilité complète test manuel ↔ test automatisé.

### Problème

Le pipeline actuel (V1/V2) passe directement de l'analyse de l'US à la génération de code automatisé. Cela pose trois problèmes :

1. **Pas de validation humaine intermédiaire** — le QA n'a aucun moyen de vérifier que les cas de test générés sont pertinents avant d'obtenir du code.
2. **Pas de traçabilité réglementaire** — dans les secteurs régulés (banque, santé, assurance), chaque test automatisé doit être rattaché à un cas de test validé dans l'outil de test management.
3. **Pas de valeur pour les équipes non-automatisées** — les équipes QA qui font du test manuel n'ont aucun intérêt à utiliser TestForge aujourd'hui.

### Solution

Insérer une étape "tests manuels" entre l'analyse et la génération automatisée :

```
US → Analyse → Génération tests manuels → Push Xray/ADO → Revue QA → Validation
                                                                          ↓
                                              Génération tests auto ← Récupération IDs
                                                     ↓
                                              Code POM avec @testCaseId("XRAY-123")
```

### Impact sur le marché

- **Élargit la cible** : les équipes QA sans automatisation peuvent utiliser TestForge pour structurer leurs tests manuels.
- **Argument de vente enterprise** : traçabilité requirement → test manuel → test auto, exigée par ISO 29119, DO-178C, IEC 62304.
- **Différenciant unique** : aucun concurrent ne propose ce pipeline en un outil.

---

## Personas impactés

| Persona | Impact |
|---------|--------|
| **Sarah (QA Engineer)** | Gagne un moyen de valider les cas de test AVANT de générer le code. Peut aussi utiliser TestForge uniquement pour les tests manuels. |
| **Marc (PO)** | Peut voir ses AC transformées en tests manuels structurés — validation fonctionnelle rapide sans compétence technique. |
| **Thomas (Tech Lead)** | Obtient la traçabilité test auto ↔ test manuel pour les audits et les revues de conformité. |

---

## User Stories

### US-MTF-1 — Générer des tests manuels depuis les critères d'acceptance (Priority: P1)

Sarah a analysé une US. Elle veut générer un ensemble de cas de test manuels structurés (steps action + résultat attendu) à partir des critères d'acceptance et des suggestions d'amélioration de l'analyse. Les tests manuels doivent couvrir le happy path ET les cas d'erreur identifiés.

**Why this priority**: C'est le cœur de la feature. Sans cette étape, rien d'autre ne fonctionne. C'est aussi la fonctionnalité qui a de la valeur immédiate même sans automatisation.

**Independent Test**: Analyser une US avec des AC → cliquer "Générer tests manuels" → vérifier que les cas de test couvrent les scénarios fonctionnels avec des steps clairs.

**Acceptance Scenarios**:

1. **Given** une analyse terminée pour une US avec des AC, **When** Sarah clique "Générer tests manuels", **Then** un ensemble de cas de test manuels est généré avec pour chaque cas : un titre, une précondition, des steps (action + résultat attendu), et une priorité (critical/high/medium/low).
2. **Given** une US avec un score d'analyse < 40, **When** Sarah tente de générer les tests manuels, **Then** un avertissement indique que la qualité de l'US est insuffisante et suggère d'abord d'utiliser la version améliorée.
3. **Given** une US avec à la fois des AC fonctionnels et techniques, **When** les tests manuels sont générés, **Then** seuls les critères testables manuellement sont transformés en steps (les critères de performance ou techniques sont marqués "hors périmètre manuel").
4. **Given** une version améliorée disponible (post-analyse), **When** Sarah choisit "Utiliser la version améliorée", **Then** les tests manuels sont générés depuis la version améliorée et non l'US originale.

---

### US-MTF-2 — Pousser les tests manuels vers Xray / ADO Test Plans (Priority: P1)

Sarah veut que les tests manuels générés soient créés comme Tests dans Xray Cloud ou comme Test Cases dans ADO Test Plans, liés à l'US source. Le push doit être un clic, pas un copier-coller.

**Why this priority**: Sans le push vers l'outil de test management, les tests manuels n'ont pas de valeur intégrée — ils resteraient dans TestForge sans lien avec le backlog.

**Independent Test**: Générer des tests manuels → cliquer "Pousser vers Xray" → vérifier dans Xray que les Tests sont créés avec les steps et liés à l'US.

**Acceptance Scenarios**:

1. **Given** des tests manuels générés et une connexion Xray configurée, **When** Sarah clique "Pousser vers Xray", **Then** chaque cas de test manuel est créé comme un Test Xray avec les steps, lié à l'US source comme requirement.
2. **Given** des tests manuels générés et ADO configuré, **When** Thomas clique "Pousser vers ADO", **Then** chaque cas de test est créé comme Test Case ADO avec les steps, lié à l'US source et rattaché au Test Suite du sprint courant.
3. **Given** un push réussi, **When** Sarah consulte les tests manuels dans TestForge, **Then** chaque cas de test affiche son ID externe (ex: XRAY-123 ou TC#456) avec un lien direct vers l'outil source.
4. **Given** un push déjà effectué pour cette analyse, **When** Sarah reclique "Pousser vers Xray", **Then** le système propose de mettre à jour les tests existants ou de créer de nouveaux tests.

---

### US-MTF-3 — Éditer, valider ou régénérer les tests manuels (Priority: P1)

Marc (PO) et Sarah (QA) veulent pouvoir revoir les tests manuels générés, les éditer directement dans TestForge (modifier un step, ajouter un cas, supprimer un cas non pertinent), puis valider le lot. La régénération complète est aussi possible si les AC ont changé.

**Why this priority**: La porte de validation humaine est le mécanisme de confiance central. Sans elle, les tests manuels ne sont que du contenu IA non vérifié.

**Independent Test**: Générer des tests manuels → modifier un step → valider → vérifier que l'état "validé" est enregistré avec la date et l'auteur.

**Acceptance Scenarios**:

1. **Given** des tests manuels générés, **When** Sarah visualise la liste, **Then** elle peut éditer chaque test inline : modifier le titre, les préconditions, ajouter/supprimer/réordonner des steps.
2. **Given** des tests manuels édités, **When** Marc clique "Valider tous les tests", **Then** le lot est marqué comme validé avec la date, l'auteur, et l'état "validé" est visible dans l'historique.
3. **Given** des tests manuels déjà pushés dans Xray, **When** Sarah modifie un step dans TestForge et re-push, **Then** le test Xray existant est mis à jour (pas de doublon créé).
4. **Given** l'US source a changé (writeback ou sync), **When** Sarah clique "Régénérer", **Then** les tests manuels sont régénérés depuis les nouvelles AC, en présentant un diff avec la version précédente.
5. **Given** des tests manuels non validés, **When** Sarah tente de générer les tests automatisés, **Then** un avertissement indique que les tests manuels n'ont pas été validés (mais la génération auto reste possible).

---

### US-MTF-4 — Re-synchroniser les tests manuels depuis Xray / ADO (Priority: P2)

Après le push initial, le QA peut avoir modifié les tests directement dans Xray ou ADO (ajouté des steps, reformulé un cas). Avant de générer les tests automatisés, TestForge doit pouvoir re-lire les tests manuels depuis l'outil externe pour s'assurer que le code auto correspond aux tests manuels tels que validés.

**Why this priority**: Important pour la cohérence mais pas bloquant pour le MVP de la feature — en V1 de la feature, on peut se baser sur les tests stockés dans TestForge.

**Independent Test**: Pousser des tests vers Xray → modifier un step dans Xray → cliquer "Resync" dans TestForge → vérifier que le step modifié est bien récupéré.

**Acceptance Scenarios**:

1. **Given** des tests manuels poussés vers Xray, **When** Sarah clique "Resync depuis Xray", **Then** les steps actuels dans Xray remplacent ceux dans TestForge et un diff est affiché.
2. **Given** un test supprimé dans Xray, **When** la resync est lancée, **Then** le test correspondant dans TestForge est marqué "supprimé dans la source" (pas de suppression automatique).
3. **Given** des tests poussés vers ADO, **When** Thomas clique "Resync depuis ADO", **Then** les Test Steps ADO sont relus et synchronisés.

---

### US-MTF-5 — Générer les tests automatisés avec lien aux tests manuels validés (Priority: P1)

Sarah a des tests manuels validés (avec leurs IDs Xray/ADO). Elle veut maintenant générer le code automatisé. Le code doit inclure un lien explicite vers le test manuel correspondant pour chaque test spec.

**Why this priority**: C'est l'aboutissement du pipeline — le lien test manuel ↔ test auto est le différenciant clé.

**Independent Test**: Valider des tests manuels avec IDs → générer les tests auto → vérifier que le code contient les annotations `@testCaseId`.

**Acceptance Scenarios**:

1. **Given** des tests manuels validés avec IDs externes (XRAY-123, XRAY-124), **When** Sarah génère les tests automatisés, **Then** chaque fichier `*.spec.ts` contient une annotation `test.describe('Feature - XRAY-123', { tag: ['@XRAY-123'] }, ...)` ou un commentaire structuré `// Linked to: XRAY-123`.
2. **Given** un test manuel avec 5 steps, **When** le test automatisé est généré, **Then** chaque step du test manuel correspond à un bloc dans le test auto (commenté `// Step 1: [action du test manuel]`).
3. **Given** des tests manuels validés SANS IDs externes (jamais pushés), **When** Sarah génère les tests auto, **Then** le code est généré normalement sans annotations d'ID — le lien peut être ajouté plus tard.
4. **Given** un test manuel dont les steps ont changé depuis la dernière génération auto, **When** Sarah régénère les tests auto, **Then** le code est mis à jour pour refléter les steps actuels, avec un avertissement si des tests auto avaient déjà été pushés sur Git.

---

## Edge Cases

- **US sans critères d'acceptance** : la génération de tests manuels est refusée avec un message suggérant d'ajouter des AC (ou d'utiliser la version améliorée de l'analyse).
- **AC en français vs code en anglais** : les tests manuels (steps) sont dans la langue des AC ; le code automatisé reste en anglais (convention TestForge).
- **AC très longs (> 2000 chars)** : troncature intelligente avec avertissement, cohérent avec le comportement de l'analyse.
- **Connexion Xray/ADO non configurée** : les tests manuels peuvent être générés et validés dans TestForge sans push externe. L'option "Pousser vers..." est grisée avec un lien vers les paramètres.
- **Tests manuels et tests auto désynchronisés** : si les tests manuels sont modifiés après la génération auto, un badge "tests auto potentiellement obsolètes" est affiché.
- **Régénération partielle** : si le QA a validé 8 tests sur 10 et en régénère 2, seuls les 2 non-validés sont régénérés.

---

## Requirements

### Functional Requirements

**Génération de tests manuels**

- **FR-MTF-001**: Le système DOIT générer des cas de test manuels structurés depuis les critères d'acceptance d'une US analysée.
- **FR-MTF-002**: Chaque cas de test DOIT contenir : titre, précondition (optionnelle), liste de steps (action + résultat attendu), priorité.
- **FR-MTF-003**: Le LLM DOIT distinguer les AC testables manuellement des AC techniques (performance, sécurité) et les marquer en conséquence.
- **FR-MTF-004**: La génération DOIT utiliser la même abstraction LLMClient que l'analyse et la génération auto.
- **FR-MTF-005**: Le prompt DOIT demander la couverture du happy path ET des cas d'erreur/edge cases identifiés dans l'analyse.
- **FR-MTF-006**: La génération DOIT fonctionner avec la version originale OU la version améliorée de l'US.

**Push vers Xray / ADO**

- **FR-MTF-007**: Le système DOIT pouvoir créer un Test Xray par cas de test manuel, avec les steps, lié à l'US source.
- **FR-MTF-008**: Le système DOIT pouvoir créer un Test Case ADO par cas de test manuel, avec les Test Steps, lié à l'US source.
- **FR-MTF-009**: Le push DOIT être idempotent : re-pusher met à jour les tests existants (via l'ID stocké) au lieu de créer des doublons.
- **FR-MTF-010**: Les IDs externes (Xray testKey, ADO testCaseId) DOIVENT être stockés et affichés dans TestForge.

**Validation et édition**

- **FR-MTF-011**: L'utilisateur DOIT pouvoir éditer les tests manuels dans TestForge avant le push.
- **FR-MTF-012**: L'utilisateur DOIT pouvoir valider un lot de tests manuels avec un statut "validé" + date + auteur.
- **FR-MTF-013**: La régénération DOIT présenter un diff avec la version précédente.
- **FR-MTF-014**: La validation N'EST PAS obligatoire pour générer les tests auto (avertissement seulement).

**Lien test manuel ↔ test automatisé**

- **FR-MTF-015**: Le code automatisé généré DOIT inclure l'ID du test manuel associé dans le fichier spec (tag Playwright ou commentaire structuré).
- **FR-MTF-016**: Le mapping step-by-step DOIT être visible dans le code auto (commentaires `// Step N: [action]`).
- **FR-MTF-017**: Le `GenerationService` DOIT recevoir les tests manuels validés comme contexte additionnel dans le prompt.

**Resync (P2)**

- **FR-MTF-018**: Le système DOIT pouvoir relire les tests depuis Xray Cloud (GET /test/{testKey}/step).
- **FR-MTF-019**: Le système DOIT pouvoir relire les Test Steps depuis ADO Test Plans.
- **FR-MTF-020**: La resync DOIT afficher un diff et ne jamais supprimer automatiquement des données dans TestForge.

### Non-Functional Requirements

- **Performance** : la génération de tests manuels DOIT prendre < 15 secondes (LLM compris).
- **Plan** : la génération de tests manuels est disponible sur les plans **Starter et Pro**. Le push vers Xray/ADO et la resync sont **Pro uniquement**.
- **Rétention** : les tests manuels suivent la même rétention que les analyses (30j Starter, 90j Pro).

---

## Flux utilisateur principal

```
1. Sarah ouvre une US dans TestForge
2. Elle clique "Analyser" → score + suggestions (existant)
3. Elle clique "Générer tests manuels"
   → Choix : US originale ou version améliorée
   → Loading... (appel LLM, < 15s)
   → Affichage : liste des cas de test avec steps
4. Elle revoit les tests, modifie un step, supprime un cas non pertinent
5. Marc (PO) passe en revue et clique "Valider"
6. Sarah clique "Pousser vers Xray"
   → Création des Tests dans Xray avec steps
   → Affichage des IDs Xray (XRAY-123, XRAY-124, ...)
7. Sarah clique "Générer tests automatisés"
   → Le prompt reçoit les tests manuels validés + leurs IDs
   → Le code généré contient les tags @XRAY-123 et les commentaires step-by-step
8. Sarah télécharge le ZIP ou push sur Git
```
