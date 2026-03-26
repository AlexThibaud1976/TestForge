# Checklist — Comparaison Avant/Après

> Estimation : ~8h | Prérequis : aucun

---

## Phase 1 : Algorithme de diff — Test-First (2h)

**But :** L'algorithme LCS par mots est le cœur de la feature. Il doit être parfaitement testé avant tout composant visuel.

- [ ] T001 Écrire test : `identical texts should return all unchanged tokens`
- [ ] T002 Écrire test : `should detect added words`
- [ ] T003 Écrire test : `should detect removed words`
- [ ] T004 Écrire test : `should detect mixed additions and removals`
- [ ] T005 Écrire test : `should handle empty strings`
- [ ] T006 Écrire test : `should handle multiline texts with paragraph breaks`
- [ ] T007 Écrire test : `should normalize whitespace before diffing`
- [ ] T008 Vérifier RED
- [ ] T009 Créer `apps/frontend/src/utils/diff.ts` avec `tokenize()` et `computeWordDiff()`
- [ ] T010 Implémenter la table LCS et le backtrack
- [ ] T011 Vérifier GREEN + vérifier perf : < 10ms sur 500 mots

**Checkpoint :** Algo diff testé, 7 tests au vert.

---

## Phase 2 : Composants de rendu — Test-First (3h)

### `DiffViewerUnified`

- [ ] T012 Écrire test : `should render added tokens with green background`
- [ ] T013 Écrire test : `should render removed tokens with red strikethrough`
- [ ] T014 Écrire test : `should render unchanged tokens normally`
- [ ] T015 Vérifier RED
- [ ] T016 Créer `DiffViewerUnified.tsx` : itère sur `DiffToken[]`, applique les classes CSS
- [ ] T017 Classes : added = `bg-green-100 text-green-800`, removed = `bg-red-100 text-red-800 line-through`, unchanged = normal
- [ ] T018 Vérifier GREEN

### `DiffViewerSideBySide`

- [ ] T019 Écrire test : `should render two columns`
- [ ] T020 Vérifier RED
- [ ] T021 Créer `DiffViewerSideBySide.tsx` : 2 colonnes, gauche = original (removed surlignés), droite = amélioré (added surlignés)
- [ ] T022 Vérifier GREEN

### `DiffViewer` (wrapper)

- [ ] T023 Écrire test : `should render unified mode by default`
- [ ] T024 Écrire test : `should switch to side-by-side mode`
- [ ] T025 Écrire test : `should show modification count`
- [ ] T026 Vérifier RED
- [ ] T027 Créer `DiffViewer.tsx` : toggle mode, compteur changements, rendu conditionnel
- [ ] T028 Compteur : count tokens where `type !== 'unchanged'`
- [ ] T029 Toggle : deux boutons icônes (☐☐ side-by-side / ☐ unified)
- [ ] T030 Masquer side-by-side sous 768px (responsive)
- [ ] T031 Vérifier GREEN

**Checkpoint :** 3 composants, 6 tests au vert.

---

## Phase 3 : Intégration dans StoryDetailPage (2h)

- [ ] T032 Ajouter le 3e mode "Diff" dans le toggle de version (Original / Améliorée / Diff)
- [ ] T033 Le bouton "Diff" n'est visible que si `analysis.improvedVersion` existe
- [ ] T034 Quand activeVersion === 'diff', rendre `<DiffViewer original={story.description} improved={analysis.improvedVersion} />`
- [ ] T035 Ajuster le layout : le DiffViewer occupe le même espace que le texte de description
- [ ] T036 Test manuel complet : analyser une US → voir le diff → basculer unified/side-by-side → revenir à original
- [ ] T037 Vérifier que le Writeback continue à fonctionner (non-régression)

---

## Phase 4 : Polish (1h)

- [ ] T038 `pnpm typecheck && pnpm lint && pnpm test`
- [ ] T039 Pas de `any`, pas de console.log
- [ ] T040 Responsive : side-by-side masqué sous 768px
- [ ] T041 Mettre à jour le User Guide
- [ ] T042 Commit + push → CI verte

---

> 📊 Progression : 0 / 42 tâches | ~8h estimées
