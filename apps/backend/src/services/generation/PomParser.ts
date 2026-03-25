// ─── Types ────────────────────────────────────────────────────────────────────

export interface PomMethod {
  name: string;
  params: string;
  returnType: string;
  jsdoc: string | null;
}

export interface ParsedPom {
  className: string;
  methods: PomMethod[];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse un fichier Page Object Model TypeScript généré par TestForge.
 * Utilise des regex car les POM suivent un template strict et prévisible.
 * Retourne null si aucune exported class n'est trouvée.
 */
export function parsePomFile(content: string): ParsedPom | null {
  // 1. Extraire le nom de la classe exportée
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  if (!classMatch) return null;

  const className = classMatch[1]!;
  const methods: PomMethod[] = [];

  // 2. Extraire les méthodes publiques (avec ou sans async, avec ou sans type de retour)
  // Regex pour les méthodes de classe : [async] methodName([params])[: returnType] {
  const methodRegex =
    /(?:\/\*\*\s*([\s\S]*?)\s*\*\/\s*)?(?:public\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{;]+?))?\s*(?:\{|=>)/g;

  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, jsdocRaw, name, params, returnType] = match;

    // Exclure le constructeur et les méthodes privées (commençant par _)
    if (!name || name === 'constructor' || name.startsWith('_')) continue;

    // Exclure les mots-clés TypeScript qui matchent le pattern
    const EXCLUDED = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'class', 'return', 'import', 'export', 'const', 'let', 'var']);
    if (EXCLUDED.has(name)) continue;

    // Nettoyer le JSDoc
    const jsdoc = jsdocRaw
      ? jsdocRaw.replace(/\s*\*\s*/g, ' ').replace(/^\s+|\s+$/g, '') || null
      : null;

    methods.push({
      name,
      params: (params ?? '').trim(),
      returnType: (returnType ?? 'void').trim(),
      jsdoc,
    });
  }

  return { className, methods };
}
