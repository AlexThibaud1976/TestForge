import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/index.js', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  },
}));

import { PomRegistryService, buildPomContextSection } from './PomRegistryService.js';
import type { PomRegistryEntry } from './PomRegistryService.js';

const SAMPLE_POM_CONTENT = `
import { type Page } from '@playwright/test';
export class LoginPage {
  /** Navigates to login */
  async goto(): Promise<void> {}
  async login(email: string, password: string): Promise<void> {}
}
`;

const makeEntry = (override: Partial<PomRegistryEntry> = {}): PomRegistryEntry => ({
  id: 'pom-1',
  teamId: 't-1',
  className: 'LoginPage',
  filename: 'pages/Login.page.ts',
  methods: [
    { name: 'goto', params: '', returnType: 'Promise<void>', jsdoc: 'Navigates to login' },
    { name: 'login', params: 'email: string, password: string', returnType: 'Promise<void>', jsdoc: null },
  ],
  fullContent: SAMPLE_POM_CONTENT,
  sourceGenerationId: 'gen-1',
  sourceUserStoryId: 'us-1',
  framework: 'playwright',
  language: 'typescript',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...override,
});

describe('PomRegistryService', () => {
  let service: PomRegistryService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new PomRegistryService();
    mockDb = (await import('../../db/index.js')).db;
  });

  describe('extractAndRegister()', () => {
    it('insère un POM depuis les fichiers générés', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue([]);
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.insert.mockReturnValue({ values: mockValues });

      const files = [
        { type: 'page_object' as const, filename: 'pages/Login.page.ts', content: SAMPLE_POM_CONTENT },
        { type: 'test_spec' as const, filename: 'tests/login.spec.ts', content: 'test("works", () => {})' },
        { type: 'fixtures' as const, filename: 'fixtures/login.json', content: '{}' },
      ];

      await service.extractAndRegister('gen-1', 't-1', 'us-1', files, 'playwright', 'typescript');

      // Seul le page_object doit être inséré
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
        className: 'LoginPage',
        framework: 'playwright',
        language: 'typescript',
      }));
    });

    it('ignore les fichiers non-page_object', async () => {
      const files = [
        { type: 'test_spec' as const, filename: 'tests/login.spec.ts', content: 'export class LoginSpec {}' },
      ];

      await service.extractAndRegister('gen-1', 't-1', 'us-1', files, 'playwright', 'typescript');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('ignore les fichiers sans export class valide', async () => {
      const files = [
        { type: 'page_object' as const, filename: 'pages/helper.ts', content: 'const x = 1;' },
      ];

      await service.extractAndRegister('gen-1', 't-1', 'us-1', files, 'playwright', 'typescript');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('getRelevantPom()', () => {
    it('retourne les POM du bon stack', async () => {
      const mockRows = [makeEntry(), makeEntry({ id: 'pom-2', className: 'DashboardPage' })];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockRows),
      });

      const result = await service.getRelevantPom('t-1', 'playwright', 'typescript', 5);
      expect(result).toHaveLength(2);
      expect(result[0]?.className).toBe('LoginPage');
    });
  });

  describe('deletePom()', () => {
    it('supprime le POM par id + teamId', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      });

      await service.deletePom('pom-1', 't-1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });
  });
});

describe('buildPomContextSection()', () => {
  it('retourne null si aucun POM', () => {
    expect(buildPomContextSection([])).toBeNull();
  });

  it('inclut le contenu complet si <= 3 POM', () => {
    const poms = [makeEntry(), makeEntry({ id: 'pom-2', className: 'DashboardPage' })];
    const section = buildPomContextSection(poms);
    expect(section).not.toBeNull();
    expect(section).toContain('Existing Page Objects');
    expect(section).toContain('LoginPage');
    expect(section).toContain('DashboardPage');
    // Avec <= 3 POM, le fullContent est inclus
    expect(section).toContain('export class LoginPage');
  });

  it('inclut uniquement les signatures si > 3 POM', () => {
    const poms = Array.from({ length: 4 }, (_, i) =>
      makeEntry({ id: `pom-${i}`, className: `Page${i}` }),
    );
    const section = buildPomContextSection(poms);
    // Avec > 3, pas de fullContent
    expect(section).not.toContain('export class');
    // Mais les signatures sont présentes
    expect(section).toContain('goto');
  });

  it('contient l\'instruction d\'import pour le LLM', () => {
    const section = buildPomContextSection([makeEntry()]);
    expect(section).toContain('REUSE');
    expect(section).toContain('do NOT recreate');
  });
});
