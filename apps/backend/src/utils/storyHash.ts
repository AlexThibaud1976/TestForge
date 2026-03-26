import { createHash } from 'crypto';

/**
 * Calcule un hash SHA-256 stable du contenu d'une user story.
 * Utilisé pour détecter les changements depuis la dernière génération.
 */
export function computeStoryHash(description: string | null, acceptanceCriteria: string | null): string {
  const content = `${description ?? ''}|||${acceptanceCriteria ?? ''}`;
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
