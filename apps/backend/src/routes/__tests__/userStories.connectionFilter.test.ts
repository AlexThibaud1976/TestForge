import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks (avant tout import du router) ───────────────────────────────────────

vi.mock('../../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: unknown, next: () => void) => {
    req.teamId = 'team-test-uuid';
    req.userId = 'user-test-uuid';
    req.role = 'member';
    next();
  },
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../utils/encryption.js', () => ({
  decrypt: vi.fn((v: string) => v),
}));

vi.mock('../../services/connectors/JiraConnector.js', () => ({
  JiraConnector: vi.fn(),
}));

vi.mock('../../services/connectors/ADOConnector.js', () => ({
  ADOConnector: vi.fn(),
}));

vi.mock('../../services/duplicates/DuplicateDetectionService.js', () => ({
  DuplicateDetectionService: vi.fn().mockImplementation(() => ({
    computeEmbedding: vi.fn().mockResolvedValue(undefined),
    detectDuplicates: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../utils/storyHash.js', () => ({
  computeStoryHash: vi.fn(() => 'test-hash'),
}));

vi.mock('../../utils/diffAC.js', () => ({
  diffAcceptanceCriteria: vi.fn(() => ({ changed: false, diff: [] })),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    query: {
      userStories: { findFirst: vi.fn() },
      sourceConnections: { findFirst: vi.fn() },
    },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn() })) })),
  },
}));

// ── Imports après mocks ───────────────────────────────────────────────────────

import userStoriesRouter from '../../routes/userStories.js';
import { db } from '../../db/index.js';

// ── App de test ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/user-stories', userStoriesRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_CONNECTION_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const mockStories = [
  {
    id: 'story-1',
    teamId: 'team-test-uuid',
    connectionId: VALID_CONNECTION_UUID,
    externalId: 'PROJ-1',
    title: 'Login user',
    description: 'As a user I want to login',
    status: 'To Do',
    labels: [],
    fetchedAt: new Date().toISOString(),
  },
  {
    id: 'story-2',
    teamId: 'team-test-uuid',
    connectionId: VALID_CONNECTION_UUID,
    externalId: 'PROJ-2',
    title: 'Reset password',
    description: 'As a user I want to reset my password',
    status: 'In Progress',
    labels: ['auth'],
    fetchedAt: new Date().toISOString(),
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupDbSelect(rows: unknown[], count: number): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = db as any;

  mockDb.select.mockImplementation((fields?: unknown) => {
    if (fields !== undefined && fields !== null) {
      // Count query: db.select({ count: ... }).from().where()
      const countChain = { from: vi.fn(), where: vi.fn().mockResolvedValue([{ count }]) };
      countChain.from.mockReturnValue(countChain);
      return countChain;
    }
    // Rows query: db.select().from().where().limit().offset().orderBy()
    const rowsChain = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
      offset: vi.fn(),
      orderBy: vi.fn().mockResolvedValue(rows),
    };
    rowsChain.from.mockReturnValue(rowsChain);
    rowsChain.where.mockReturnValue(rowsChain);
    rowsChain.limit.mockReturnValue(rowsChain);
    rowsChain.offset.mockReturnValue(rowsChain);
    return rowsChain;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('connectionFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/user-stories?connectionId=<valid-uuid> retourne uniquement les stories de cette connexion', async () => {
    setupDbSelect(mockStories, mockStories.length);

    const res = await request(app)
      .get(`/api/user-stories?connectionId=${VALID_CONNECTION_UUID}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(
      res.body.data.every((s: { connectionId: string }) => s.connectionId === VALID_CONNECTION_UUID),
    ).toBe(true);
  });

  it('GET /api/user-stories?connectionId=<uuid-inexistant> retourne { data: [], total: 0 }, pas une erreur', async () => {
    setupDbSelect([], 0);

    const nonExistentUUID = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/user-stories?connectionId=${nonExistentUUID}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('GET /api/user-stories?connectionId=<uuid>&search=login retourne le filtre combiné', async () => {
    const loginOnly = [mockStories[0]!];
    setupDbSelect(loginOnly, 1);

    const res = await request(app)
      .get(`/api/user-stories?connectionId=${VALID_CONNECTION_UUID}&search=login`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect((res.body.data[0] as { title: string }).title).toMatch(/login/i);
  });

  it('GET /api/user-stories?connectionId=<uuid>&status=To%20Do retourne le filtre combiné', async () => {
    const todoOnly = [mockStories[0]!];
    setupDbSelect(todoOnly, 1);

    const res = await request(app)
      .get(`/api/user-stories?connectionId=${VALID_CONNECTION_UUID}&status=To%20Do`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect((res.body.data[0] as { status: string }).status).toBe('To Do');
  });
});
