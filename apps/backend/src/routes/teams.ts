import { Router } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/index.js';
import { teams, teamMembers, invitations } from '../db/schema.js';
import { requireAuth, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.js';
import type { Request } from 'express';
import crypto from 'crypto';

const router: ReturnType<typeof Router> = Router();

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
);

// GET /api/teams/me
router.get('/me', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }
  res.json(team);
});

// PUT /api/teams/me
router.put('/me', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({ name: z.string().min(1).max(100) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const [updated] = await db
    .update(teams)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning();

  res.json(updated);
});

// GET /api/teams/me/members
router.get('/me/members', requireAuth, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
  });

  // Enrichir avec les emails depuis Supabase Auth
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const userMap = new Map(data.users.map((u) => [u.id, u.email]));

  res.json(members.map((m) => ({
    ...m,
    email: userMap.get(m.userId) ?? null,
  })));
});

// POST /api/teams/me/invitations — envoyer une invitation
router.post('/me/invitations', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const parsed = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member']).default('member'),
  }).safeParse(req.body);

  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  // Vérifier si l'utilisateur est déjà membre
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = users.users.find((u) => u.email === parsed.data.email);
  if (existingUser) {
    const alreadyMember = await db.query.teamMembers.findFirst({
      where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, existingUser.id)),
    });
    if (alreadyMember) {
      res.status(400).json({ error: 'User is already a member of this team' });
      return;
    }
  }

  // Vérifier les limites du plan (Starter : max 5 membres)
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (team?.plan === 'starter') {
    const memberCount = await db.query.teamMembers.findMany({ where: eq(teamMembers.teamId, teamId) });
    if (memberCount.length >= 5) {
      res.status(403).json({ error: 'Starter plan is limited to 5 members. Upgrade to Pro for unlimited members.' });
      return;
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

  const [invitation] = await db
    .insert(invitations)
    .values({
      teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      expiresAt,
    })
    .returning();

  // En prod : envoyer un email avec le lien d'invitation
  // Pour l'instant : retourner le lien dans la réponse (dev only)
  const inviteUrl = `${process.env['FRONTEND_URL']}/invite/${token}`;

  res.status(201).json({
    id: invitation?.id,
    email: parsed.data.email,
    role: parsed.data.role,
    expiresAt,
    inviteUrl, // TODO: envoyer par email en prod
  });
});

// GET /api/teams/me/invitations — liste des invitations en attente
router.get('/me/invitations', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId } = req as AuthenticatedRequest;
  const pending = await db.query.invitations.findMany({
    where: and(eq(invitations.teamId, teamId)),
    orderBy: (inv, { desc }) => [desc(inv.createdAt)],
  });
  res.json(pending.filter((inv) => !inv.acceptedAt && new Date() < inv.expiresAt));
});

// DELETE /api/teams/me/members/:userId
router.delete('/me/members/:userId', requireAuth, requireAdmin, async (req: Request, res) => {
  const { teamId, userId: currentUserId } = req as AuthenticatedRequest;

  if (req.params['userId'] === currentUserId) {
    res.status(400).json({ error: 'Cannot remove yourself from the team' });
    return;
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, req.params['userId'] as string)));

  res.status(204).send();
});

export default router;
