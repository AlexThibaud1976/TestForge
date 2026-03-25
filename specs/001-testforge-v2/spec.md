# Feature Specification: TestForge V2

**Feature Branch**: `001-testforge-v2`
**Created**: 2026-03-25
**Status**: Draft
**Input**: TestForge V2 — 8 features post-MVP

---

## Table des Matières

1. [User Scenarios & Testing](#user-scenarios--testing)
2. [Requirements](#requirements)
3. [Success Criteria](#success-criteria)
4. [Assumptions](#assumptions)

---

## User Scenarios & Testing

### User Story 1 — Push Git : exporter les tests vers un repo (Priority: P1)

Sarah (QA Engineer) a généré des tests Playwright pour une user story. Elle veut pousser ces fichiers directement dans son repo GitHub d'équipe, soit en commit direct sur une branche dédiée, soit en ouvrant une Pull Request, sans quitter TestForge.

**Why this priority**: C'est le cas d'usage principal post-génération. Il ferme la boucle "TestForge génère → les tests atterrissent dans le repo" et supprime le copier-coller manuel. Demande client directe du 24/03/2026.

**Independent Test**: Peut être testé indépendamment en configurant un repo Git cible et en validant qu'un commit ou une PR est créée après génération.

**Acceptance Scenarios**:

1. **Given** une génération terminée (statut success), **When** Sarah clique "Pousser vers Git" et sélectionne le mode "Pull Request", **Then** une PR est créée sur le repo cible avec les fichiers générés sur une branche nommée `testforge/US-{id}-{slug}`.
2. **Given** une génération terminée, **When** Sarah choisit le mode "Commit direct", **Then** les fichiers sont committés sur la branche configurée sans créer de PR.
3. **Given** un token PAT invalide, **When** Sarah tente de pousser, **Then** un message d'erreur explicite est affiché et aucun commit n'est créé.
4. **Given** un repo configuré, **When** la même génération est poussée deux fois, **Then** le système prévient qu'une branche existe déjà et propose une action (forcer / annuler).

---

### User Story 2 — Writeback Jira/ADO : mettre à jour l'US source (Priority: P1)

Marc (PO) a lancé une analyse sur une US. L'IA a produit une version améliorée avec des critères d'acceptance précis. Marc veut pousser cette version améliorée directement dans Jira pour que l'US source soit enrichie, sans retourner dans Jira manuellement.

**Why this priority**: Ferme la boucle analyse → amélioration → mise à jour source. Valeur directe pour le PO. Demande client directe du 24/03/2026.

**Independent Test**: Peut être testé indépendamment en vérifiant que la description et les AC de l'US dans Jira/ADO sont mis à jour après l'action.

**Acceptance Scenarios**:

1. **Given** une analyse terminée avec une version améliorée, **When** Marc clique "Mettre à jour l'US dans Jira", **Then** un dialog de confirmation affiche les changements (diff avant/après), et après validation, la description et les AC de l'US sont mis à jour dans Jira.
2. **Given** une US sur Azure DevOps, **When** Marc clique "Mettre à jour l'US dans ADO", **Then** le champ Description et le champ Acceptance Criteria du work item sont mis à jour.
3. **Given** une mise à jour effectuée, **When** Marc consulte l'historique de l'US dans TestForge, **Then** la date/heure et le contenu du dernier writeback sont visibles.
4. **Given** des droits insuffisants sur le projet Jira, **When** Marc tente un writeback, **Then** un message d'erreur clair est affiché (permissions insuffisantes).

---

### User Story 3 — Intégration Xray : créer un test traçable (Priority: P1)

Sarah génère des tests pour une US. Son équipe utilise Xray pour la gestion des tests dans Jira. Elle veut que les tests générés soient automatiquement créés comme Tests Xray liés à l'US source, avec les Test Steps pré-remplis, pour assurer la traçabilité requirement ↔ test.

**Why this priority**: Traçabilité critique pour les équipes certifiées. Demande client directe du 24/03/2026. Différenciant fort sur le marché QA enterprise.

**Independent Test**: Peut être testé indépendamment en vérifiant la création d'un Test Xray lié à l'US source avec les steps attendus.

**Acceptance Scenarios**:

1. **Given** une génération terminée et une connexion Xray configurée, **When** Sarah clique "Créer test Xray", **Then** un Test est créé dans le projet Xray avec les critères d'acceptance transformés en Test Steps et lié à l'US source comme requirement.
2. **Given** plusieurs critères d'acceptance, **When** le Test Xray est créé, **Then** chaque critère d'acceptance correspond à un Test Step (action + résultat attendu).
3. **Given** un Test Xray déjà créé pour cette génération, **When** Sarah reclique "Créer test Xray", **Then** le système propose de mettre à jour l'existant ou de créer un nouveau test.
4. **Given** une configuration Xray invalide, **When** la création échoue, **Then** un message d'erreur détaillé est affiché.

---

### User Story 4 — Intégration ADO Test Plans : créer un Test Case lié (Priority: P1)

Thomas (Tech Lead) utilise Azure DevOps Test Plans pour organiser les tests de son équipe. Après génération dans TestForge, il veut créer un Test Case ADO lié à la User Story avec les Test Steps pré-remplis et rattaché au Test Suite du sprint courant.

**Why this priority**: Parité fonctionnelle avec Xray pour les clients ADO. Demande client directe du 24/03/2026.

**Independent Test**: Peut être testé en vérifiant la création d'un Test Case ADO avec les steps et le lien au Test Suite.

**Acceptance Scenarios**:

1. **Given** une génération terminée et ADO configuré, **When** Thomas clique "Créer Test Case ADO", **Then** un Test Case work item est créé, lié à la User Story source, avec les Test Steps remplis depuis les critères d'acceptance.
2. **Given** un Test Suite de sprint configuré, **When** le Test Case est créé, **Then** il est automatiquement rattaché au Test Suite du sprint courant.
3. **Given** un Test Case déjà existant pour cette génération, **When** Thomas reclique "Créer Test Case ADO", **Then** le système indique l'ID du test existant et propose mise à jour ou création.

---

### User Story 5 — Nouveaux frameworks : générer des tests pour plus d'outils (Priority: P2)

Sarah travaille dans une équipe .NET qui utilise Playwright C#. Thomas a une équipe Ruby avec Selenium. Ils veulent que TestForge génère des tests avec leur stack technologique, avec la même qualité POM + fixtures.

**Why this priority**: Élargit le TAM. Pas bloquant pour V2 launch mais stratégique pour les clients enterprise multi-stack.

**Independent Test**: Peut être testé indépendamment pour chaque combinaison framework/langage en vérifiant que le code généré compile et respecte le pattern POM.

**Acceptance Scenarios**:

1. **Given** une US analysée, **When** Sarah sélectionne "Playwright C#", **Then** TestForge génère 3 fichiers (Page Object, Test Spec, Fixtures) en syntaxe C# avec NUnit ou xUnit, respectant le pattern POM.
2. **Given** une US analysée, **When** Thomas sélectionne "Selenium Ruby", **Then** les tests générés utilisent RSpec + Page Object en Ruby idiomatique.
3. **Given** n'importe quelle combinaison framework/langage supportée, **When** le code est généré, **Then** les données de test sont externalisées (pas de valeurs hardcodées) et le pattern POM est respecté.

**Nouvelles combinaisons à supporter** :
- Selenium C# (NUnit)
- Selenium Ruby (RSpec)
- Selenium Kotlin (JUnit 5)
- Playwright C# (NUnit/xUnit)
- Cypress JavaScript
- Cypress TypeScript

---

### User Story 6 — Nouveaux providers LLM : Mistral et Ollama (Priority: P2)

Une équipe française veut utiliser Mistral pour garder ses données en Europe avec un provider souverain. Une équipe bancaire veut utiliser Ollama en on-premise pour ne pas envoyer de données à l'extérieur.

**Why this priority**: Souveraineté des données et contraintes réglementaires sont des blockers d'achat pour certains segments. Renforce la proposition de valeur enterprise.

**Independent Test**: Peut être testé indépendamment en configurant chaque provider et en validant qu'une analyse et une génération aboutissent.

**Acceptance Scenarios**:

1. **Given** un compte Mistral AI, **When** Thomas configure Mistral comme provider LLM de son équipe, **Then** les analyses et générations utilisent l'API Mistral de la même façon que OpenAI.
2. **Given** un serveur Ollama local, **When** Thomas configure l'endpoint Ollama (URL + modèle), **Then** TestForge peut analyser et générer en utilisant le modèle local sans aucune donnée sortant du réseau interne.
3. **Given** un provider Ollama configuré, **When** le serveur Ollama est inaccessible, **Then** un message d'erreur clair est affiché avec le statut de connexion.

---

### User Story 7 — Templates POM personnalisables (Priority: P2)

Thomas a une architecture POM très spécifique dans son équipe (conventions de nommage, imports obligatoires, classe de base commune). Il veut que TestForge génère du code qui respecte ces conventions sans devoir tout ré-éditer à chaque fois.

**Why this priority**: Rétention et adoption long terme. Réduit la friction post-génération. Différenciant pour les grandes équipes avec des standards internes.

**Independent Test**: Peut être testé en configurant un template et en vérifiant que le code généré l'incorpore correctement.

**Acceptance Scenarios**:

1. **Given** un template POM configuré par l'équipe (classe de base, imports, naming), **When** une génération est lancée, **Then** le code généré respecte le template comme base de départ.
2. **Given** un template configuré, **When** Thomas modifie le template, **Then** les prochaines générations utilisent la nouvelle version du template (les anciennes ne sont pas modifiées).
3. **Given** aucun template configuré, **When** une génération est lancée, **Then** le comportement par défaut (template standard) s'applique.

---

### User Story 8 — Super Admin backoffice (Priority: P3)

Alexandre (Product Owner / Ops) a besoin de surveiller l'activité de tous les clients : voir quelles équipes utilisent le produit, lesquelles sont en trial ou en abonnement payant, combien de générations ont été faites, et pouvoir suspendre/réactiver un compte en cas de problème.

**Why this priority**: Opérationnel interne, ne génère pas de valeur client directement mais indispensable pour gérer les clients post-launch.

**Independent Test**: Peut être testé en accédant à la route /super-admin et en vérifiant les actions disponibles.

**Acceptance Scenarios**:

1. **Given** un utilisateur avec le rôle `super_admin`, **When** il accède à `/super-admin`, **Then** il voit la liste de toutes les équipes avec leur plan, leur statut, leur nombre de membres et leur usage LLM du mois courant.
2. **Given** la liste des équipes, **When** Alexandre clique sur une équipe, **Then** il voit le détail : membres, générations récentes, historique de facturation, statut d'abonnement Stripe.
3. **Given** une équipe active, **When** Alexandre clique "Suspendre le compte", **Then** tous les membres de cette équipe perdent l'accès à l'app jusqu'à réactivation, sans perte de données.
4. **Given** une équipe suspendue, **When** Alexandre clique "Réactiver", **Then** les membres retrouvent l'accès immédiatement.
5. **Given** n'importe quel utilisateur sans le rôle `super_admin`, **When** il tente d'accéder à `/super-admin`, **Then** il reçoit une erreur 403.

---

### Edge Cases

- **Push Git** : que se passe-t-il si le repo cible n'existe pas ou le PAT a expiré ?
- **Push Git** : que se passe-t-il si la branche existe déjà (génération poussée deux fois) ?
- **Writeback** : que se passe-t-il si l'US a été supprimée dans Jira/ADO depuis l'import ?
- **Writeback** : comportement si les droits d'écriture sont absents sur le projet Jira/ADO ?
- **Xray / ADO Test Plans** : que se passe-t-il si les critères d'acceptance sont vides ?
- **Nouveaux frameworks** : LLM qui ne supporte pas un langage rare (ex: Kotlin via Ollama local) ?
- **Ollama** : endpoint inaccessible ou modèle non chargé ?
- **Templates POM** : template malformé qui empêche la compilation du code généré ?
- **Super Admin** : suspendre le compte d'un utilisateur en cours de génération ?

---

## Requirements

### Functional Requirements

**Push Git**

- **FR-001**: Les équipes DOIVENT pouvoir configurer un ou plusieurs repos Git cibles (GitHub, GitLab, Azure Repos) avec URL + token PAT chiffré.
- **FR-002**: Depuis une génération terminée, l'utilisateur DOIT pouvoir choisir entre "commit direct" et "créer une PR".
- **FR-003**: Le nom de branche DOIT être auto-généré selon le pattern `testforge/US-{externalId}-{slug}`.
- **FR-004**: Le système DOIT afficher le statut du push (en cours, succès, erreur) et conserver un lien vers le commit ou la PR créée.
- **FR-005**: Les tokens PAT Git DOIVENT être chiffrés en base (AES-256-GCM) comme les clés LLM.

**Writeback Jira/ADO**

- **FR-006**: Depuis une analyse terminée, l'utilisateur DOIT pouvoir pousser la version améliorée de l'US vers sa source (Jira ou ADO). **Disponible sur le plan Pro uniquement.**
- **FR-007**: Le système DOIT afficher un diff (avant/après) et demander confirmation avant tout writeback.
- **FR-008**: Chaque writeback DOIT être enregistré en base (date, auteur, contenu) pour constituer un historique.
- **FR-009**: Le writeback Jira DOIT mettre à jour les champs Description et Acceptance Criteria (si le champ existe).
- **FR-010**: Le writeback ADO DOIT mettre à jour les champs Description et Acceptance Criteria du work item.

**Intégration Xray**

- **FR-011**: Les équipes DOIVENT pouvoir configurer une connexion Xray Cloud avec les credentials appropriés (client_id + client_secret). Xray Server est hors périmètre V2.
- **FR-012**: Depuis une génération terminée, l'utilisateur DOIT pouvoir créer un Test Xray lié à l'US source.
- **FR-013**: Les Test Steps DOIVENT être dérivés des critères d'acceptance (chaque AC → un Step avec action + résultat attendu).
- **FR-014**: Le Test Xray créé DOIT être lié à l'US source comme requirement Xray pour la traçabilité.
- **FR-015**: Le système DOIT stocker l'ID du Test Xray créé et l'afficher sur la génération associée.

**Intégration ADO Test Plans**

- **FR-016**: Depuis une génération terminée, l'utilisateur DOIT pouvoir créer un Test Case ADO lié à la User Story source.
- **FR-017**: Les Test Steps ADO DOIVENT être dérivés des critères d'acceptance de la même façon que Xray.
- **FR-018**: Le Test Case DOIT être rattaché au Test Suite du sprint courant si celui-ci est détectable.
- **FR-019**: Le système DOIT stocker l'ID du Test Case ADO créé et l'afficher sur la génération associée.

**Nouveaux Frameworks**

- **FR-020**: Le système DOIT supporter 6 nouvelles combinaisons framework/langage : Selenium C#, Selenium Ruby, Selenium Kotlin, Playwright C#, Cypress JavaScript, Cypress TypeScript.
- **FR-021**: Chaque combinaison DOIT générer 3 fichiers respectant la même architecture POM + fixtures + données externalisées que les frameworks existants.
- **FR-022**: Les nouvelles combinaisons DOIVENT s'intégrer dans le PromptRegistry existant sans modifier le cœur du service de génération.

**Nouveaux Providers LLM**

- **FR-023**: Le système DOIT supporter Mistral AI (API cloud) via un nouvel adapter respectant l'interface LLMClient.
- **FR-024**: Le système DOIT supporter Ollama (endpoint HTTP local configurable) via un nouvel adapter respectant l'interface LLMClient.
- **FR-025**: La configuration Ollama DOIT inclure l'URL de l'endpoint et le nom du modèle.
- **FR-026**: Les équipes sur le plan Pro DOIVENT pouvoir sélectionner Mistral ou Ollama comme provider LLM.

**Templates POM**

- **FR-027**: Chaque équipe DOIT pouvoir définir un template de page object (imports, classe de base, style de nommage). **Disponible sur les plans Starter et Pro.**
- **FR-028**: Le template DOIT être injecté dans le prompt de génération pour guider la structure du code produit.
- **FR-029**: La modification d'un template NE DOIT PAS affecter les générations déjà effectuées.

**Super Admin Backoffice**

- **FR-030**: Une route `/super-admin` DOIT exister, protégée par un rôle `super_admin` distinct du rôle `admin` d'équipe.
- **FR-031**: Le dashboard DOIT afficher : liste des équipes, plan actuel, statut (actif/trial/suspendu), nombre de membres, usage LLM du mois.
- **FR-032**: L'administrateur DOIT pouvoir suspendre ou réactiver un compte équipe.
- **FR-033**: La suspension DOIT révoquer l'accès à tous les membres de l'équipe sans supprimer les données.
- **FR-034**: Le dashboard DOIT permettre de voir les dernières générations d'une équipe.

### Key Entities

- **GitConfig** : configuration repo Git d'une équipe — provider (github/gitlab/azure_repos), URL, token PAT chiffré, branche par défaut.
- **GitPush** : historique d'un push — generationId, gitConfigId, mode (commit/pr), branche créée, URL du commit/PR, statut, createdAt.
- **WritebackHistory** : historique d'un writeback — analysisId, userStoryId, contenu avant/après, auteur, createdAt.
- **XrayConfig** : configuration Xray d'une équipe — type (cloud/server), URL, credentials chiffrés.
- **XrayTest** : référence à un test Xray créé — generationId, xrayTestId, xrayTestKey, createdAt.
- **ADOTestCase** : référence à un Test Case ADO créé — generationId, testCaseId, testSuiteId, createdAt.
- **PomTemplate** : template POM d'une équipe — teamId, framework, language, content, createdAt, updatedAt.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Une équipe peut passer de "génération terminée" à "commit créé dans le repo" en moins de 30 secondes.
- **SC-002**: Une équipe peut passer de "analyse terminée" à "US mise à jour dans Jira/ADO" en moins de 20 secondes.
- **SC-003**: Le temps de création d'un Test Xray ou ADO Test Case depuis une génération est inférieur à 30 secondes.
- **SC-004**: Les 6 nouvelles combinaisons framework/langage produisent du code qui compile sans erreur dans 95% des cas (US avec critères d'acceptance complets).
- **SC-005**: Mistral et Ollama produisent des analyses et générations de qualité équivalente à OpenAI sur le set de 5 US de référence défini dans `apps/backend/src/tests/fixtures/benchmark-stories.ts` (score global delta < 5 points entre providers).
- **SC-006**: Les générations utilisant un template POM personnalisé incorporent le template dans 100% des cas.
- **SC-007**: L'administrateur super_admin peut consulter l'état de tous les comptes clients en moins de 3 secondes après chargement du dashboard.
- **SC-008**: Une action de suspension prend effet pour tous les membres de l'équipe en moins de 5 secondes.

---

## Assumptions

- Les intégrations Push Git couvrent GitHub (API v3/REST), GitLab (API v4), et Azure Repos (API v7.1) — pas d'autres providers Git en V2.
- Les tokens PAT Git ont les droits suffisants côté provider (création de branches, PRs) — TestForge ne gère pas les droits Git.
- Xray V2 (Cloud) est supporté en priorité ; Xray Server (legacy) est un bonus si les credentials sont compatibles.
- Les modèles Mistral supportés en V2 : `mistral-large-latest` et `mistral-small-latest` au minimum.
- Ollama est autohébergé par le client — TestForge ne fournit pas d'instance Ollama.
- Les templates POM sont du texte libre (pas un DSL ou un éditeur visuel) — le client colle son template manuellement.
- Le rôle `super_admin` est assigné manuellement en base (pas d'interface d'auto-inscription en tant que super admin).
- Les plans Starter et Pro conservent leurs périmètres actuels — les nouvelles features d'intégration (Git, Xray, ADO Test Plans) sont disponibles uniquement sur le plan Pro.
- Les nouveaux frameworks utilisent les mêmes LLM que les frameworks existants — pas de modèle spécifique requis.
- La V2 est développée post-démo Itecor (juin 2026) — pas de deadline fixe mais objectif Q3 2026.
