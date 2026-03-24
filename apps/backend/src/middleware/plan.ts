import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teams } from '../db/schema.js';
import type { AuthenticatedRequest } from './auth.js';

/**
 * Vérifie que l'équipe a un plan actif (pas expiré).
 * À placer après requireAuth sur les routes "métier".
 */
export async function requireActivePlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { teamId } = req as AuthenticatedRequest;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });

  if (!team) { res.status(403).json({ error: 'Team not found' }); return; }

  if (team.plan === 'trial' && team.trialEndsAt && new Date() > team.trialEndsAt) {
    res.status(403).json({
      error: 'Trial expired. Please subscribe to continue.',
      code: 'TRIAL_EXPIRED',
    });
    return;
  }

  next();
}

/**
 * Vérifie que l'équipe a le plan Pro.
 * Starter = OpenAI uniquement, membres limités à 5.
 */
export async function requireProPlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { teamId } = req as AuthenticatedRequest;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });

  if (team?.plan !== 'pro') {
    res.status(403).json({
      error: 'This feature requires the Pro plan.',
      code: 'PRO_REQUIRED',
    });
    return;
  }

  next();
}
