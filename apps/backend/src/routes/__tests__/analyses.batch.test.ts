import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../middleware/auth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requireAuth: (req: any, _res: unknown, next: () => void) => {
    req.teamId = 'team-test-uuid';
    req.userId = 'user-test-uuid';
    req.role = 'member';
    next();
  },
}));

vi.mock('../../services/analysis/AnalysisService.js', () => ({
  AnalysisService: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({ id: 'analysis-1', scoreGlobal: 72 }),
  })),
}));

vi.mock('../../services/analysis/BatchAnalysisService.js', () => ({
  BatchAnalysisService: vi.fn().mockImplementation(() => ({
    analyzeBatch: vi.fn().mockResolvedValue({ results: [], stats: {} }),
  })),
}));

vi.mock('../../db/index.js', () => ({
  db: {
    query: { analyses: { findFirst: vi.fn() } },
  },
}));

// ── Imports après mocks ────────────────────────────────────────────────────────

import analysesRouter from '../../routes/analyses.js';

// ── App de test ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/analyses', analysesRouter);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/analyses/batch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return 202 immediately with batchId and total', async () => {
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({ userStoryIds: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'] });

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('batchId');
    expect(res.body).toHaveProperty('total', 2);
  });

  it('should return a UUID-format batchId', async () => {
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({ userStoryIds: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'] });

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(res.body.batchId as string).toMatch(uuidRegex);
  });

  it('should return 400 for empty userStoryIds array', async () => {
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({ userStoryIds: [] });

    expect(res.status).toBe(400);
  });

  it('should return 400 for more than 50 IDs', async () => {
    const ids = Array.from({ length: 51 }, () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({ userStoryIds: ids });

    expect(res.status).toBe(400);
  });

  it('should return 400 for non-UUID values', async () => {
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({ userStoryIds: ['not-a-uuid'] });

    expect(res.status).toBe(400);
  });

  it('should return 400 for missing userStoryIds field', async () => {
    const res = await request(app)
      .post('/api/analyses/batch')
      .set('Authorization', 'Bearer test-token')
      .send({});

    expect(res.status).toBe(400);
  });
});
