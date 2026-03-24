import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

interface Team { id: string; name: string; plan: string; trialEndsAt: string | null; }
interface Member { id: string; userId: string; email: string | null; role: string; joinedAt: string; }
interface Invitation { id: string; email: string; role: string; expiresAt: string; inviteUrl: string; }

export function TeamPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteResult, setInviteResult] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Team>('/api/teams/me'),
      api.get<Member[]>('/api/teams/me/members'),
      api.get<Invitation[]>('/api/teams/me/invitations'),
    ]).then(([t, m, i]) => {
      setTeam(t); setTeamName(t.name);
      setMembers(m); setInvitations(i);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await api.put<Team>('/api/teams/me', { name: teamName });
    setTeam(updated); setEditingName(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await api.post<Invitation>('/api/teams/me/invitations', { email: inviteEmail, role: inviteRole });
      setInviteResult(result);
      setInviteEmail('');
      setInvitations((prev) => [...prev, result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm('Retirer ce membre ?')) return;
    await api.delete(`/api/teams/me/members/${userId}`);
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const planBadge = (plan: string) => {
    const cfg: Record<string, string> = {
      trial: 'bg-yellow-100 text-yellow-700',
      starter: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
    };
    return cfg[plan] ?? 'bg-gray-100 text-gray-600';
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Équipe</h1>

      {/* Infos équipe */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Informations</h2>
          {team && <span className={`text-xs px-2 py-0.5 rounded-full ${planBadge(team.plan)}`}>{team.plan}</span>}
        </div>
        {editingName ? (
          <form onSubmit={(e) => void handleRename(e)} className="flex gap-2">
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
            <button type="button" onClick={() => setEditingName(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">✕</button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-900 font-medium">{team?.name}</span>
            <button onClick={() => setEditingName(true)} className="text-xs text-blue-600 hover:underline">Renommer</button>
          </div>
        )}
        {team?.trialEndsAt && team.plan === 'trial' && (
          <p className="text-xs text-yellow-600 mt-2">
            Trial jusqu'au {new Date(team.trialEndsAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* Membres */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Membres ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1.5">
              <div>
                <span className="text-sm text-gray-900">{m.email ?? m.userId}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${m.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.role}
                </span>
              </div>
              <button onClick={() => void handleRemove(m.userId)}
                className="text-xs text-red-400 hover:text-red-600">Retirer</button>
            </div>
          ))}
        </div>
      </div>

      {/* Inviter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Inviter un membre</h2>
        <form onSubmit={(e) => void handleInvite(e)} className="space-y-3">
          <div className="flex gap-2">
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="sarah@acme.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none bg-white">
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Inviter</button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {inviteResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-xs">
              <p className="text-green-700 font-medium">✓ Invitation créée</p>
              <p className="text-gray-500 mt-1">Lien à partager :</p>
              <code className="block mt-1 bg-white border border-gray-200 rounded px-2 py-1 text-gray-700 break-all">
                {inviteResult.inviteUrl}
              </code>
            </div>
          )}
        </form>

        {/* Invitations en attente */}
        {invitations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">En attente</p>
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-xs text-gray-500 py-1">
                <span>{inv.email}</span>
                <span>expire {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
