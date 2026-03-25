import type { FileError } from '../CodeValidator.js';

export const CORRECTION_PROMPT_VERSION = 'v1.0';

export function buildCorrectionPrompt(filename: string, code: string, errors: FileError[]): string {
  const errorList = errors
    .map((e) => `  - Ligne ${e.line}: ${e.message}`)
    .join('\n');

  return `Le fichier suivant contient des erreurs de compilation :

**Fichier** : \`${filename}\`

**Erreurs** :
${errorList}

**Code actuel** :
\`\`\`
${code}
\`\`\`

Corrige UNIQUEMENT les erreurs listées ci-dessus.
Ne modifie PAS :
- La logique métier ou les test cases
- La structure Page Object Model (POM)
- Les données externalisées ni les fixtures
- Les noms de méthodes, classes ou variables

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après :
{ "filename": "${filename}", "content": "<code corrigé complet>" }`;
}
