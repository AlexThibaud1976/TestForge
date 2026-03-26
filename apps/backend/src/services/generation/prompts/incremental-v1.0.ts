/**
 * Prompt de régénération incrémentale — version 1.0
 * Reçoit le code existant + le diff de l'US → produit une mise à jour ciblée.
 */

import type { GeneratedFileResult } from '../GenerationService.js';

export const INCREMENTAL_PROMPT_VERSION = 'incremental-v1.0';

export const INCREMENTAL_SYSTEM_PROMPT = `Tu es un expert QA senior. Le code de test suivant a été généré pour une User Story.
La User Story a été modifiée. Tu dois mettre à jour le code pour refléter uniquement les changements.

Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après.

## Schéma de réponse attendu (identique à la génération standard)

{
  "files": [
    { "type": "page_object", "filename": "...", "content": "..." },
    { "type": "test_spec", "filename": "...", "content": "..." },
    { "type": "fixtures", "filename": "...", "content": "..." }
  ]
}

## Règles ABSOLUES pour la mise à jour incrémentale

1. **Modifie le MINIMUM de code nécessaire** — si un test n'est pas impacté par le diff, ne le touche pas
2. **Préserve tous les tests existants** qui ne sont pas liés aux AC supprimés
3. **Préserve les ajustements manuels** — sélecteurs modifiés, données ajoutées, commentaires personnalisés
4. **Pour les AC ajoutés** : ajoute de nouveaux test cases dans le spec
5. **Pour les AC supprimés** : retire uniquement les tests correspondants
6. **Pour les AC modifiés** : mets à jour le test concerné sans toucher aux autres
7. **Retourne les 3 fichiers complets** (pas de diff partiel — le fichier complet mis à jour)`;

export function buildIncrementalPrompt(
  existingFiles: GeneratedFileResult[],
  diffText: string,
  userStoryTitle: string,
  changePercent: number,
): string {
  const filesSections = existingFiles.map((f) => {
    return `### ${f.filename} (${f.type})\n\`\`\`\n${f.content}\n\`\`\``;
  }).join('\n\n');

  const warningSection = changePercent >= 60
    ? `\n⚠️ ATTENTION : ${changePercent}% des critères ont changé. Cela représente un changement important.\nSi nécessaire, régénère entièrement plutôt que de faire des modifications partielles incorrectes.\n`
    : '';

  return `## User Story : ${userStoryTitle}
${warningSection}
## Code existant à mettre à jour

${filesSections}

## Diff de la User Story

${diffText}

Mets à jour le code en suivant les règles ci-dessus. Retourne les 3 fichiers complets.`;
}
