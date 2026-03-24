# Script de Démo — TestForge
## Petit-déjeuner Itecor — Juin 2026
### Durée totale : ~12 minutes

---

## Préparation (avant la démo)

- [ ] Backend démarré : `cd apps/backend && pnpm dev`
- [ ] Frontend démarré : `cd apps/frontend && pnpm dev`
- [ ] Stripe listener : `stripe listen --forward-to http://localhost:3099/api/webhooks/stripe`
- [ ] Connecté sur `http://localhost:5173` avec le compte de démo
- [ ] Browser plein écran, DevTools fermées
- [ ] Les 5 US de démo sont visibles dans la liste

---

## Accroche (30 secondes)

> *"Combien de temps vos QA passent-ils à écrire des tests depuis des user stories ?
> 2h par US en moyenne. TestForge ramène ça à 15 minutes.
> Je vous montre."*

---

## Parcours 1 — Thomas (Tech Lead) : Configuration (2 min)

**Message :** "Thomas arrive, il configure l'outil en 3 clics."

1. Montrer la page **Connexions** → connexion Jira déjà configurée
   > *"On connecte Jira avec un simple API token. TestForge ne stocke jamais les credentials en clair — tout est chiffré AES-256."*

2. Montrer la page **🤖 LLM** → config Anthropic Claude déjà présente
   > *"Thomas choisit son provider LLM. Azure OpenAI pour les équipes qui veulent garder leurs données dans leur tenant. On supporte OpenAI, Anthropic et Azure."*

3. Montrer la page **👥 Équipe** → inviter Sarah
   > *"Il invite Sarah par email. Elle reçoit un lien, elle rejoint en 30 secondes."*

**Punch line :** *"Configuration totale : 5 minutes. Ensuite c'est les devs et QA qui utilisent."*

---

## Parcours 2 — Marc (PO) : Analyse qualité (4 min)

**Message :** "Marc veut savoir si ses US sont assez précises avant le sprint planning."

1. Aller sur **User Stories** → cliquer sur **"Améliorer le profil utilisateur"** (TF-DEMO-2)
   > *"Regardez cette US — c'est typique de ce qu'on reçoit."*

2. Cliquer **Analyser cette US** → attendre ~8 secondes
   > *"TestForge envoie l'US au LLM avec un prompt structuré qui évalue 5 dimensions..."*

3. Montrer le résultat : **score ~18/100, alerte rouge**
   > *"18/100. Pas de critères d'acceptance, action non précisée, aucun edge case. TestForge liste exactement ce qui manque."*

4. Faire défiler jusqu'à la **version améliorée** → cliquer "Utiliser cette version"
   > *"Et il propose immédiatement une version complète, prête à coller dans Jira."*

5. Revenir à la liste → cliquer sur **"Connexion utilisateur"** (TF-DEMO-1)
   > *"Maintenant une US bien écrite..."*

6. Analyser → montrer **score ~78/100, vert**
   > *"78/100. C'est ça qu'on veut avant de générer des tests."*

**Punch line :** *"Marc valide la qualité de ses US avant le sprint. Plus de 'on n'a pas testé ça' lors du sprint review."*

---

## Parcours 3 — Sarah (QA) : Génération de tests (5 min)

**Message :** "Sarah repart avec du code prêt à merger."

1. Sur la page de **"Connexion utilisateur"** (déjà analysée, score 78)

2. Dans "Générer les tests" → sélectionner **Playwright · TypeScript** → cliquer **"Générer (version améliorée)"**
   > *"Sarah choisit son framework. Playwright TypeScript, Java, Python... Selenium aussi. On génère."*

3. Attendre ~25 secondes
   > *"25 secondes. Pendant ce temps Sarah prend son café."* ☕

4. Montrer le **CodeViewer** — onglet Page Object
   > *"Regardez la structure : une classe `LoginPage` avec des locators `data-testid`. Pas de XPath fragiles, pas de classes CSS. Du code maintenable."*

5. Switcher sur l'onglet **Test Spec**
   > *"Happy path + 3 cas d'erreur. Exactement ce que les critères d'acceptance demandent."*

6. Switcher sur **Fixtures**
   > *"Les données de test externalisées. Jamais hardcodées dans le code."*

7. Cliquer **⬇ ZIP** → le fichier se télécharge
   > *"Elle télécharge le ZIP — structure Playwright standard, prêt à coller dans son repo."*

8. Changer framework → **Selenium v4 · Java** → Générer
   > *"L'équipe d'à côté fait du Java ? Même US, même analyse, framework différent."*

**Punch line :** *"2 heures → 15 minutes. Et le code respecte l'architecture de l'équipe dès le départ."*

---

## Pricing & Clôture (1 min)

> *"TestForge est disponible maintenant en beta."*

| Plan | Prix | Pour qui |
|------|------|----------|
| **Starter** | 49€/équipe/mois | Équipes jusqu'à 5 personnes, OpenAI |
| **Pro** | 99€/équipe/mois | Équipes grandes, tous providers LLM |
| **Trial** | 14 jours gratuits | Sans CB |

> *"Questions ?"*

---

## Questions fréquentes

**"Nos US restent chez nous ?"**
> Les US et le code généré n'sont jamais utilisés pour entraîner des modèles. Hébergement EU. Et si vous utilisez Azure OpenAI, tout reste dans votre tenant.

**"Ça supporte Selenium ?"**
> Oui — Java, Python. Playwright en TS, JS, Python, Java. C# en cours.

**"On peut personnaliser les templates ?"**
> Sur la roadmap v2 — templates POM personnalisables par équipe.

**"Intégration CI/CD ?"**
> Roadmap v2 — export en PR automatique GitHub/GitLab.
