import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/index.js';
import { teams, teamMembers, invitations } from '../db/schema.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import type { Request } from 'express';
import crypto from 'crypto';

const router: ReturnType<typeof Router> = Router();

const supabaseAdmin = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_KEY']!,
);

// POST /api/auth/register — créer compte + équipe + trial 14j
router.post('/register', async (req: Request, res) => {
  const parsed = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    teamName: z.string().min(1).max(100),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, teamName } = parsed.data;

  // 1. Créer l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // confirmer directement en v1 (pas de flow email)
  });

  if (authError || !authData.user) {
    res.status(400).json({ error: authError?.message ?? 'Failed to create user' });
    return;
  }

  // 2. Créer l'équipe + team_member admin en transaction
  const [team] = await db
    .insert(teams)
    .values({
      name: teamName,
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    })
    .returning();

  if (!team) {
    res.status(500).json({ error: 'Failed to create team' });
    return;
  }

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: authData.user.id,
    role: 'admin',
  });

  res.status(201).json({
    message: 'Account created successfully',
    teamId: team.id,
  });
});

// POST /api/auth/invite/accept — accepter une invitation
router.post('/invite/accept', async (req: Request, res) => {
  const parsed = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, parsed.data.token),
  });

  if (!invitation) {
    res.status(404).json({ error: 'Invitation not found or already used' });
    return;
  }
  if (invitation.acceptedAt) {
    res.status(400).json({ error: 'Invitation already accepted' });
    return;
  }
  if (new Date() > invitation.expiresAt) {
    res.status(400).json({ error: 'Invitation has expired' });
    return;
  }

  // Créer ou récupérer l'utilisateur Supabase
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  let userId = existing.users.find((u) => u.email === invitation.email)?.id;

  if (!userId) {
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (error || !newUser.user) {
      res.status(400).json({ error: error?.message ?? 'Failed to create user' });
      return;
    }
    userId = newUser.user.id;
  }

  // Créer le team_member
  await db.insert(teamMembers).values({
    teamId: invitation.teamId,
    userId,
    role: invitation.role as 'admin' | 'member',
  });

  // Marquer l'invitation comme acceptée
  await db
    .update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.token, parsed.data.token));

  res.json({ message: 'Invitation accepted successfully' });
});

// GET /api/auth/invite/:token — vérifier une invitation (public)
router.get('/invite/:token', async (req: Request, res) => {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.token, req.params['token'] as string),
  });

  if (!invitation || invitation.acceptedAt || new Date() > invitation.expiresAt) {
    res.status(404).json({ error: 'Invalid or expired invitation' });
    return;
  }

  res.json({ email: invitation.email, teamId: invitation.teamId });
});

export default router;
