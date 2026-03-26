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

// Cache court (60s) pour éviter 2 appels réseau Supabase par requête
interface AuthCacheEntry {
  userId: string;
  teamId: string;
  role: 'admin' | 'member';
  expiresAt: number;
}
const AUTH_CACHE_TTL_MS = 60_000;
const authCache = new Map<string, AuthCacheEntry>();

// Nettoyage périodique des entrées expirées
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authCache) {
    if (now >= entry.expiresAt) authCache.delete(key);
  }
}, 120_000);

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

  // Servir depuis le cache si disponible
  const cached = authCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    (req as AuthenticatedRequest).userId = cached.userId;
    (req as AuthenticatedRequest).teamId = cached.teamId;
    (req as AuthenticatedRequest).role = cached.role;
    next();
    return;
  }

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
  // Le try/catch protège le cas où la colonne suspended_at n'existe pas encore en base
  try {
    const [team] = await db
      .select({ suspendedAt: teams.suspendedAt })
      .from(teams)
      .where(eq(teams.id, member.team_id as string))
      .limit(1);

    if (team?.suspendedAt) {
      res.status(403).json({ error: 'account_suspended' });
      return;
    }
  } catch {
    // Colonne suspended_at non encore migrée — on continue sans le check
  }

  const userId = data.user.id;
  const teamId = member.team_id as string;
  const role = member.role as 'admin' | 'member';

  authCache.set(token, { userId, teamId, role, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });

  (req as AuthenticatedRequest).userId = userId;
  (req as AuthenticatedRequest).teamId = teamId;
  (req as AuthenticatedRequest).role = role;

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if ((req as AuthenticatedRequest).role !== 'admin') {
    res.status(403).json({ error: 'Admin role required' });
    return;
  }
  next();
}
