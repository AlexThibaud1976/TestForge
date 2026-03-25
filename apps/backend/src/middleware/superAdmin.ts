import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { superAdmins } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthenticatedRequest } from './auth.js';

export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const [record] = await db
    .select({ id: superAdmins.id })
    .from(superAdmins)
    .where(eq(superAdmins.userId, userId))
    .limit(1);

  if (!record) {
    res.status(403).json({ error: 'Super admin role required' });
    return;
  }

  next();
}
