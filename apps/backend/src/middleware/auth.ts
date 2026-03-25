import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/index.js';
import { teams } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
);

export interface AuthenticatedRequest extends Request {
  userId: string;
  teamId: string;
  role: 'admin' | 'member';
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Récupérer le team_member pour obtenir teamId et role
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (memberError || !member) {
    res.status(403).json({ error: 'User is not part of any team' });
    return;
  }

  // V2: vérifier que le compte équipe n'est pas suspendu
  const [team] = await db
    .select({ suspendedAt: teams.suspendedAt })
    .from(teams)
    .where(eq(teams.id, member.team_id as string))
    .limit(1);

  if (team?.suspendedAt) {
    res.status(403).json({ error: 'account_suspended' });
    return;
  }

  (req as AuthenticatedRequest).userId = data.user.id;
  (req as AuthenticatedRequest).teamId = member.team_id as string;
  (req as AuthenticatedRequest).role = member.role as 'admin' | 'member';

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthenticatedRequest).role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }
  next();
}
