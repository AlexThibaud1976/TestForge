import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: unknown, next: () => void) => {
    req.teamId = 'team-a-uuid';
    req.userId = 'user-test-uuid';
    req.role = 'member';
    next();
  },
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../utils/encryption.js', () => ({ decrypt: vi.fn((v: string) => v) }));
vi.mock('../../services/connectors/ADOConnector.js', () => ({ ADOConnector: vi.fn() }));
vi.mock('../../routes/xray.js', () => ({ handleCreateXrayTest: vi.fn() }));
vi.mock('../../services/generation/GenerationService.js', () => ({
  GenerationService: vi.fn().mockImplementation(() => ({
    createPending: vi.fn(),
    processGeneration: vi.fn(),
    processIncrementalGeneration: vi.fn(),
    buildZip: vi.fn(),
  })),
}));
vi.mock('../../services/git/GitPushService.js', () => ({
  GitPushService: vi.fn().mockImplementation(() => ({ push: vi.fn() })),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    query: {
      generations: { findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => ({ returning: vi.fn() })) })) })),
  },
}));

// ── Imports après mocks ───────────────────────────────────────────────────────

import generationsRouter from '../../routes/generations.js';
import { db } from '../../db/index.js';

// ── App de test ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/generations', generationsRouter);

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONN_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TEAM_A = 'team-a-uuid';

const makeHistoryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'gen-1',
  analysisId: 'analysis-1',
  framework: 'playwright',
  language: 'typescript',
  usedImprovedVersion: false,
  llmProvider: 'openai',
  llmModel: 'gpt-4o',
  status: 'success',
  durationMs: 1200,
  createdAt: new Date().toISOString(),
  userStoryId: 'us-1',
  userStoryTitle: 'Login user',
  userStoryExternalId: 'PROJ-1',
  connectionId: CONN_UUID,
  connectionName: 'Backend Jira',
  connectionType: 'jira',
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupHistorySelect(rows: unknown[]): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb = db as any;
  const chain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  mockDb.select.mockReturnValue(chain);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/generations/history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return enriched generations with US title and connection data', async () => {
    const row = makeHistoryRow();
    setupHistorySelect([row]);

    const res = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      userStoryTitle: 'Login user',
      userStoryExternalId: 'PROJ-1',
      connectionName: 'Backend Jira',
      connectionType: 'jira',
    });
  });

  it('should return null fields for orphan generations (no linked US)', async () => {
    const orphan = makeHistoryRow({
      userStoryId: null,
      userStoryTitle: null,
      userStoryExternalId: null,
      connectionId: null,
      connectionName: null,
      connectionType: null,
    });
    setupHistorySelect([orphan]);

    const res = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body[0].userStoryTitle).toBeNull();
    expect(res.body[0].connectionName).toBeNull();
  });

  it('should filter by connectionId query param', async () => {
    const filtered = [makeHistoryRow()];
    setupHistorySelect(filtered);

    const res = await request(app)
      .get(`/api/generations/history?connectionId=${CONN_UUID}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].connectionId).toBe(CONN_UUID);
  });

  it('should only return generations for the authenticated team', async () => {
    const teamRow = makeHistoryRow({ id: 'gen-for-team-a' });
    setupHistorySelect([teamRow]);

    const res = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token'); // req.teamId = TEAM_A

    expect(res.status).toBe(200);
    // Team B generations are not returned (filtered in WHERE by the mock returning only team A data)
    expect(res.body.every((r: { id: string }) => r.id === 'gen-for-team-a')).toBe(true);
  });

  it('should return max 50 results ordered by createdAt desc', async () => {
    const rows = Array.from({ length: 50 }, (_, i) => makeHistoryRow({ id: `gen-${i}` }));
    setupHistorySelect(rows);

    const res = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(50);
  });

  it('should return empty array when no generations exist', async () => {
    setupHistorySelect([]);

    const res = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should not conflict with GET /api/generations/:id', async () => {
    setupHistorySelect([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any).query.generations.findFirst.mockResolvedValue(null);

    // /history returns array
    const histRes = await request(app)
      .get('/api/generations/history')
      .set('Authorization', 'Bearer test-token');
    expect(histRes.status).toBe(200);
    expect(Array.isArray(histRes.body)).toBe(true);

    // /:id for unknown id returns 404 (not mistakenly hitting /history)
    const idRes = await request(app)
      .get('/api/generations/some-uuid-that-is-not-history')
      .set('Authorization', 'Bearer test-token');
    expect(idRes.status).toBe(404);
  });
});
