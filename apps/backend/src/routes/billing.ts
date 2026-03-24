import { Router } from 'express';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import type { Request } from 'express';

const router: ReturnType<typeof Router> = Router();

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2025-02-24.acacia',
});

// Prix Stripe (à configurer dans le dashboard Stripe, puis mettre les IDs ici)
const PRICE_IDS: Record<string, string> = {
  starter: process.env['STRIPE_PRICE_STARTER'] ?? '',
  pro:     process.env['STRIPE_PRICE_PRO'] ?? '',
};

// POST /api/billing/checkout — créer une session Stripe Checkout
router.post('/checkout', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }

  const plan = (req.body as { plan?: string }).plan ?? 'starter';
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    res.status(400).json({ error: `Invalid plan: ${plan}. Use 'starter' or 'pro'.` });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(team.stripeCustomerId ? { customer: team.stripeCustomerId } : {}),
    metadata: { teamId },
    success_url: `${process.env['FRONTEND_URL']}/settings/billing?success=1`,
    cancel_url: `${process.env['FRONTEND_URL']}/settings/billing?cancelled=1`,
  });

  res.json({ url: session.url });
});

// POST /api/billing/portal — portail client Stripe
router.post('/portal', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team?.stripeCustomerId) {
    res.status(400).json({ error: 'No Stripe customer found. Subscribe first.' });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${process.env['FRONTEND_URL']}/settings/billing`,
  });

  res.json({ url: session.url });
});

// POST /api/webhooks/stripe — événements Stripe (pas d'auth JWT)
router.post('/webhooks/stripe', async (req: Request, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) { res.status(400).json({ error: 'Missing stripe-signature header' }); return; }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      // Express avec express.raw() pour ce endpoint (voir index.ts)
      req.body as Buffer,
      sig,
      process.env['STRIPE_WEBHOOK_SECRET']!,
    );
  } catch {
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const teamId = session.metadata?.['teamId'];
      if (!teamId || !session.customer) break;

      await db.update(teams).set({
        stripeCustomerId: session.customer as string,
        updatedAt: new Date(),
      }).where(eq(teams.id, teamId));
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const team = await db.query.teams.findFirst({
        where: eq(teams.stripeCustomerId, customerId),
      });
      if (!team) break;

      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      const priceId = subscription.items.data[0]?.price.id;

      let plan: 'trial' | 'starter' | 'pro' = 'trial';
      if (isActive && priceId === PRICE_IDS['starter']) plan = 'starter';
      else if (isActive && priceId === PRICE_IDS['pro']) plan = 'pro';

      await db.update(teams).set({ plan, updatedAt: new Date() }).where(eq(teams.id, team.id));
      break;
    }
  }

  res.json({ received: true });
});

export default router;
