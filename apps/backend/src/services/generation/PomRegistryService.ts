import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { pomRegistry } from '../../db/schema.js';
import { parsePomFile, type PomMethod } from './PomParser.js';
import type { GeneratedFileResult } from './GenerationService.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PomRegistryEntry {
  id: string;
  teamId: string;
  className: string;
  filename: string;
  methods: PomMethod[];
  fullContent: string;
  sourceGenerationId: string | null;
  sourceUserStoryId: string | null;
  framework: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class PomRegistryService {
  /**
   * Extrait les POM des fichiers générés et les enregistre dans le registre.
   * Appelé après chaque génération réussie.
   */
  async extractAndRegister(
    generationId: string,
    teamId: string,
    userStoryId: string,
    files: GeneratedFileResult[],
    framework: string,
    language: string,
  ): Promise<void> {
    // Filtrer uniquement les page objects TS/JS — Python, Ruby, C# ont leur propre format
    const pomFiles = files.filter(
      (f) => f.type === 'page_object' && (f.filename.endsWith('.ts') || f.filename.endsWith('.js')),
    );

    for (const file of pomFiles) {
      const parsed = parsePomFile(file.content);
      if (!parsed) continue;

      // Upsert : on conflict (teamId, className, framework, language) → update
      try {
        await db
          .insert(pomRegistry)
          .values({
            teamId,
            className: parsed.className,
            filename: file.filename,
            methods: parsed.methods,
            fullContent: file.content,
            sourceGenerationId: generationId,
            sourceUserStoryId: userStoryId,
            framework,
            language,
          })
          .onConflictDoUpdate({
            target: [pomRegistry.teamId, pomRegistry.className, pomRegistry.framework, pomRegistry.language],
            set: {
              filename: file.filename,
              methods: parsed.methods,
              fullContent: file.content,
              sourceGenerationId: generationId,
              sourceUserStoryId: userStoryId,
              updatedAt: new Date(),
            },
          });
      } catch {
        // Silencieux si l'upsert échoue — non bloquant pour la génération
      }
    }
  }

  /**
   * Récupère les POM les plus récents pour un stack donné.
   * Utilisé avant la génération pour injecter le contexte dans le prompt.
   */
  async getRelevantPom(
    teamId: string,
    framework: string,
    language: string,
    limit = 5,
  ): Promise<PomRegistryEntry[]> {
    const rows = await db
      .select()
      .from(pomRegistry)
      .where(
        and(
          eq(pomRegistry.teamId, teamId),
          eq(pomRegistry.framework, framework),
          eq(pomRegistry.language, language),
        ),
      )
      .orderBy(desc(pomRegistry.updatedAt))
      .limit(limit);

    return rows.map(this.toEntry);
  }

  /**
   * Liste tous les POM d'une équipe (pour le frontend).
   */
  async listPom(teamId: string): Promise<PomRegistryEntry[]> {
    const rows = await db
      .select()
      .from(pomRegistry)
      .where(eq(pomRegistry.teamId, teamId))
      .orderBy(desc(pomRegistry.updatedAt));

    return rows.map(this.toEntry);
  }

  /**
   * Supprime un POM du registre.
   */
  async deletePom(pomId: string, teamId: string): Promise<void> {
    await db
      .delete(pomRegistry)
      .where(and(eq(pomRegistry.id, pomId), eq(pomRegistry.teamId, teamId)));
  }

  private toEntry(row: typeof pomRegistry.$inferSelect): PomRegistryEntry {
    return {
      id: row.id,
      teamId: row.teamId,
      className: row.className,
      filename: row.filename,
      methods: (row.methods ?? []) as PomMethod[],
      fullContent: row.fullContent,
      sourceGenerationId: row.sourceGenerationId ?? null,
      sourceUserStoryId: row.sourceUserStoryId ?? null,
      framework: row.framework,
      language: row.language,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

// ─── Formatage du contexte POM pour le prompt ─────────────────────────────────

/**
 * Construit la section "Existing Page Objects" à injecter dans le prompt de génération.
 */
export function buildPomContextSection(poms: PomRegistryEntry[]): string | null {
  if (poms.length === 0) return null;

  const lines: string[] = [
    '## Existing Page Objects (REUSE these, do NOT recreate)',
    '',
    'You MUST import and reuse these Page Objects instead of creating new ones with the same name.',
    'If you need additional methods on an existing POM, describe them in a comment but do NOT redefine the class.',
    '',
  ];

  for (const pom of poms) {
    lines.push(`### ${pom.className} (${pom.filename})`);

    // Si peu de POM, inclure le contenu complet pour plus de contexte
    if (poms.length <= 3) {
      lines.push('```typescript');
      lines.push(pom.fullContent);
      lines.push('```');
    } else {
      // Sinon, inclure uniquement les signatures
      for (const method of pom.methods) {
        const jsdoc = method.jsdoc ? `  /** ${method.jsdoc} */` : '';
        const signature = `- ${method.name}(${method.params}): ${method.returnType}`;
        if (jsdoc) lines.push(`${jsdoc}\n${signature}`);
        else lines.push(signature);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
