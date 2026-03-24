import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

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
