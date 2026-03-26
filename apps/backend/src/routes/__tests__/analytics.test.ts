import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: unknown, next: () => void) => {
    req.teamId = 'team-test-uuid';
    req.userId = 'user-test-uuid';
    req.role = 'admin';
    next();
  },
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../../services/analytics/AnalyticsService.js', () => ({
  AnalyticsService: vi.fn().mockImplementation(() => ({
    getMetrics: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// ── Imports après mocks ────────────────────────────────────────────────────────

import analyticsRouter from '../../routes/analytics.js';
import { db } from '../../db/index.js';

// ── App de test ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

// ── Helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

/** Crée un objet thenable (awaitable) qui simule une query Drizzle chainable */
function makeChain(result: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then: (resolve: (v: unknown[]) => void) => Promise.resolve(result).then(resolve),
    catch: (reject: (e: unknown) => void) => Promise.resolve(result).catch(reject),
  };
  const stub = vi.fn().mockReturnValue(chain);
  ['from', 'innerJoin', 'leftJoin', 'where', 'groupBy', 'orderBy', 'limit', 'set'].forEach(
    (m) => { chain[m] = stub; },
  );
  return chain;
}

const CONN_UUID = 'conn-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** Prépare les 6 réponses attendues par GET /dashboard */
function setupDashboardMock(overrides?: Partial<{
  team: unknown[];
  kpi: unknown[];
  dist: unknown[];
  weekly: unknown[];
  byConn: unknown[];
  genCount: unknown[];
}>) {
  const defaults = {
    team: [{ manualTestMinutes: 30 }],
    kpi: [{ averageScore: 72, totalAnalyses: 10 }],
    dist: [
      { bucket: 'green', count: 5 },
      { bucket: 'yellow', count: 3 },
      { bucket: 'red', count: 2 },
    ],
    weekly: [{ week: '2024-W01', averageScore: 70, count: 3 }],
    byConn: [{
      connectionId: CONN_UUID, connectionName: 'Backend', connectionType: 'jira',
      averageScore: 72, analysisCount: 10, generationCount: 8,
    }],
    genCount: [{ total: 15 }],
  };
  const responses = { ...defaults, ...overrides };

  let callIdx = 0;
  const order = [responses.team, responses.kpi, responses.dist, responses.weekly, responses.byConn, responses.genCount];
  mockDb.select.mockImplementation(() => makeChain(order[callIdx++] ?? []));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/analytics/dashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should return kpis with averageScore, totalAnalyses, totalGenerations, timeSaved', async () => {
    setupDashboardMock();

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.kpis).toMatchObject({
      averageScore: 72,
      totalAnalyses: 10,
      totalGenerations: 15,
      manualTestMinutes: 30,
      timeSavedMinutes: 450, // 15 * 30
    });
  });

  it('should return distribution with green/yellow/red buckets', async () => {
    setupDashboardMock();

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.distribution).toEqual({ green: 5, yellow: 3, red: 2 });
  });

  it('should return weeklyScores array', async () => {
    setupDashboardMock();

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.weeklyScores).toHaveLength(1);
    expect(res.body.weeklyScores[0]).toMatchObject({ week: '2024-W01', averageScore: 70 });
  });

  it('should return byConnection array with analysisCount and generationCount', async () => {
    setupDashboardMock();

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.byConnection).toHaveLength(1);
    expect(res.body.byConnection[0]).toMatchObject({
      connectionName: 'Backend',
      analysisCount: 10,
      generationCount: 8,
    });
  });

  it('should filter by connectionId query param', async () => {
    setupDashboardMock({ kpi: [{ averageScore: 68, totalAnalyses: 4 }] });

    const res = await request(app)
      .get(`/api/analytics/dashboard?connectionId=${CONN_UUID}`)
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.kpis.totalAnalyses).toBe(4);
  });

  it('should return zeros when no data exists', async () => {
    setupDashboardMock({
      team: [{ manualTestMinutes: 30 }],
      kpi: [],
      dist: [],
      weekly: [],
      byConn: [],
      genCount: [],
    });

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.kpis.averageScore).toBe(0);
    expect(res.body.kpis.totalAnalyses).toBe(0);
    expect(res.body.distribution).toEqual({ green: 0, yellow: 0, red: 0 });
    expect(res.body.weeklyScores).toEqual([]);
    expect(res.body.byConnection).toEqual([]);
  });
});

describe('PUT /api/analytics/test-estimate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock db.update chain
    const updateChain = { set: vi.fn(), where: vi.fn().mockResolvedValue([]) };
    updateChain.set.mockReturnValue(updateChain);
    mockDb.update = vi.fn().mockReturnValue(updateChain);
  });

  it('should update manualTestMinutes and return the new value', async () => {
    const res = await request(app)
      .put('/api/analytics/test-estimate')
      .set('Authorization', 'Bearer test-token')
      .send({ manualTestMinutes: 45 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ manualTestMinutes: 45 });
  });

  it('should return 400 for value below minimum (5)', async () => {
    const res = await request(app)
      .put('/api/analytics/test-estimate')
      .set('Authorization', 'Bearer test-token')
      .send({ manualTestMinutes: 3 });

    expect(res.status).toBe(400);
  });

  it('should return 400 for value above maximum (240)', async () => {
    const res = await request(app)
      .put('/api/analytics/test-estimate')
      .set('Authorization', 'Bearer test-token')
      .send({ manualTestMinutes: 300 });

    expect(res.status).toBe(400);
  });

  it('should return 400 for non-integer value', async () => {
    const res = await request(app)
      .put('/api/analytics/test-estimate')
      .set('Authorization', 'Bearer test-token')
      .send({ manualTestMinutes: 'invalid' });

    expect(res.status).toBe(400);
  });
});
