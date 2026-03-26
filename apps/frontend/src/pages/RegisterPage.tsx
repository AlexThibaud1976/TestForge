import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { Card, CardContent } from '@/components/ui/card.js';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', teamName: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Créer compte + équipe via l'API
      await api.post('/api/auth/register', form);
      // 2. Se connecter automatiquement
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInError) throw new Error(signInError.message);
      void navigate('/stories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">🔧 TestForge</h1>
            <p className="mt-2 text-sm text-gray-500">Créer votre espace équipe</p>
            <p className="mt-1 text-xs text-green-600 font-medium">14 jours gratuits · sans CB</p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'équipe</Label>
              <Input type="text" required value={form.teamName} onChange={set('teamName')}
                placeholder="Acme QA Team" />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Email</Label>
              <Input type="email" required value={form.email} onChange={set('email')}
                placeholder="sarah@acme.com" />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</Label>
              <Input type="password" required minLength={8} value={form.password} onChange={set('password')}
                placeholder="8 caractères minimum" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Création...' : 'Créer mon espace équipe'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">Se connecter</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
