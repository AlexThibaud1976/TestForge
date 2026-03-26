/**
 * Calcule le diff des critères d'acceptance entre deux versions d'une US.
 */

export interface ACDiff {
  added: string[];
  removed: string[];
  modified: string[];
  unchanged: string[];
  changePercent: number; // 0-100 — proportion des AC touchés
}

/**
 * Découpe un texte de critères d'acceptance en lignes significatives.
 */
function parseACLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/**
 * Normalise une ligne pour la comparaison (minuscules, sans ponctuation de début).
 */
function normalize(line: string): string {
  return line.toLowerCase().replace(/^[-*•]\s*/, '').trim();
}

/**
 * Diff simple ligne à ligne des critères d'acceptance.
 * Retourne les lignes ajoutées, supprimées, modifiées, inchangées et le pourcentage de changement.
 */
export function diffAcceptanceCriteria(oldAC: string | null, newAC: string | null): ACDiff {
  const oldLines = parseACLines(oldAC);
  const newLines = parseACLines(newAC);

  const oldNorm = oldLines.map(normalize);
  const newNorm = newLines.map(normalize);

  const oldSet = new Set(oldNorm);
  const newSet = new Set(newNorm);

  const added = newLines.filter((_, i) => !oldSet.has(newNorm[i]!));
  const removed = oldLines.filter((_, i) => !newSet.has(oldNorm[i]!));
  const unchanged = newLines.filter((_, i) => oldSet.has(newNorm[i]!));

  // Lignes "modifiées" = supprimées + ajoutées qui semblent liées (même premier mot)
  const modified: string[] = [];

  // Total des lignes touchées
  const totalLines = Math.max(oldLines.length, newLines.length, 1);
  const changedLines = added.length + removed.length;
  const changePercent = Math.round((changedLines / totalLines) * 100);

  return { added, removed, modified, unchanged, changePercent };
}

/**
 * Formate le diff en texte lisible pour l'injection dans le prompt.
 */
export function formatDiffForPrompt(diff: ACDiff): string {
  const lines: string[] = [];

  if (diff.added.length > 0) {
    lines.push('### Critères d\'acceptance AJOUTÉS :');
    diff.added.forEach((ac) => lines.push(`+ ${ac}`));
    lines.push('');
  }

  if (diff.removed.length > 0) {
    lines.push('### Critères d\'acceptance SUPPRIMÉS :');
    diff.removed.forEach((ac) => lines.push(`- ${ac}`));
    lines.push('');
  }

  if (diff.unchanged.length > 0 && (diff.added.length > 0 || diff.removed.length > 0)) {
    lines.push(`### Critères d\'acceptance INCHANGÉS (${diff.unchanged.length}) :`);
    lines.push('(ces tests ne doivent PAS être modifiés)');
    lines.push('');
  }

  return lines.join('\n');
}
