import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Team { id: string; name: string; plan: string; trialEndsAt: string | null; }

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '49€',
    period: '/mois',
    features: [
      'Jusqu\'à 5 membres',
      'Provider OpenAI uniquement',
      'Historique illimité',
      'Jira + Azure DevOps',
      'Support email',
    ],
    cta: 'Passer au Starter',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99€',
    period: '/mois',
    features: [
      'Membres illimités',
      'Tous les providers LLM',
      'Historique 90 jours',
      'Jira + Azure DevOps',
      'Support prioritaire',
    ],
    cta: 'Passer au Pro',
    highlight: true,
  },
];

export function BillingPage() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    api.get<Team>('/api/teams/me')
      .then(setTeam).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { url } = await api.post<{ url: string }>('/api/billing/checkout', { plan: planId });
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>('/api/billing/portal', {});
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Chargement...</div>;

  const currentPlan = team?.plan ?? 'trial';
  const isPaid = currentPlan === 'starter' || currentPlan === 'pro';

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Abonnement</h1>
        {currentPlan === 'trial' && team?.trialEndsAt && (
          <p className="text-sm text-yellow-600 mt-1">
            Trial actif jusqu'au {new Date(team.trialEndsAt).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>

      {/* Notifications Stripe */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✓ Abonnement activé avec succès !
        </div>
      )}
      {cancelled && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          Paiement annulé.
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} className={`bg-white border rounded-xl p-5 relative ${plan.highlight ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-blue-600 text-white px-3 py-0.5 rounded-full">
                  Recommandé
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="w-full py-2 text-center text-sm font-medium bg-gray-100 text-gray-500 rounded-md">
                  Plan actuel
                </div>
              ) : (
                <button
                  onClick={() => void handleCheckout(plan.id)}
                  disabled={checkoutLoading === plan.id}
                  className={`w-full py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  {checkoutLoading === plan.id ? 'Redirection...' : plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Portail Stripe si abonné */}
      {isPaid && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Gérer l'abonnement</p>
            <p className="text-xs text-gray-500">Factures, changement de plan, résiliation</p>
          </div>
          <button
            onClick={() => void handlePortal()}
            disabled={portalLoading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {portalLoading ? '...' : 'Portail Stripe →'}
          </button>
        </div>
      )}
    </div>
  );
}
