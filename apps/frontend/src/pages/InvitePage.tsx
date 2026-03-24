import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';

interface InviteInfo { email: string; teamId: string; }

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<InviteInfo>(`/api/auth/invite/${token}`)
      .then(setInvite)
      .catch(() => setError('Invitation invalide ou expirée.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/api/auth/invite/accept', { token, password });
      await supabase.auth.signInWithPassword({ email: invite!.email, password });
      void navigate('/stories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Vérification...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🔧 TestForge</h1>
          <p className="mt-2 text-sm text-gray-500">Vous avez été invité à rejoindre l'équipe</p>
        </div>

        {error && !invite ? (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md text-center">{error}</p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-600 text-center">
              {invite?.email}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Choisir un mot de passe</label>
              <input type="password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Rejoindre...' : 'Rejoindre l\'équipe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
