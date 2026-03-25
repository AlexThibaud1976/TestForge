import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';

const app: Express = express();
const PORT = process.env['PORT'] ?? 3000;

const allowedOrigins =
  process.env['NODE_ENV'] === 'production'
    ? [process.env['FRONTEND_URL'] ?? '']
    : /^http:\/\/localhost(:\d+)?$/;

app.use(cors({ origin: allowedOrigins, credentials: true }));

// Stripe webhook nécessite le body brut (avant express.json())
import billingRouter from './routes/billing.js';
app.use('/api/webhooks', express.raw({ type: 'application/json' }), billingRouter);

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (_req, res) => {
  res.json({ name: 'TestForge API', version: '1.0.0', health: '/health' });
});

// Routes
import authRouter from './routes/auth.js';
import teamsRouter from './routes/teams.js';
import connectionsRouter from './routes/connections.js';
import userStoriesRouter from './routes/userStories.js';
import analysesRouter from './routes/analyses.js';
import llmConfigsRouter from './routes/llmConfigs.js';
import generationsRouter from './routes/generations.js';
app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/user-stories', userStoriesRouter);
app.use('/api/analyses', analysesRouter);
app.use('/api/llm-configs', llmConfigsRouter);
app.use('/api/generations', generationsRouter);
app.use('/api/billing', billingRouter);

// V2 routes — chargées dynamiquement pour isoler les erreurs d'import
const v2Routes: Array<{ path: string; name: string }> = [
  { path: './routes/git-configs.js', name: '/api/git-configs' },
  { path: './routes/writeback.js', name: '/api (writeback)' },
  { path: './routes/xray.js', name: '/api/xray-configs' },
  { path: './routes/pom-templates.js', name: '/api/pom-templates' },
  { path: './routes/admin.js', name: '/api/admin' },
  { path: './routes/manual-tests.js', name: '/api (manual-tests)' },
  { path: './routes/analytics.js', name: '/api/analytics' },
  { path: './routes/pom-registry.js', name: '/api/pom-registry' },
];

for (const { path: routePath, name } of v2Routes) {
  try {
    const mod = await import(routePath);
    const router = mod.default as express.Router;
    // Les routes avec nom "/api (...)" sont montées sur /api (préfixe sans les routes spécifiques)
    if (name.startsWith('/api (')) {
      app.use('/api', router);
    } else {
      app.use(name, router);
    }
    console.log(`✅ Route V2 chargée : ${name}`);
  } catch (err) {
    console.error(`❌ Erreur chargement route V2 ${name} :`, (err as Error).message);
  }
}

app.listen(PORT, () => {
  console.log(`TestForge backend running on http://localhost:${PORT}`);
});

export default app;
