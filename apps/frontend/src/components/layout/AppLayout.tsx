import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { OnboardingBanner } from '../onboarding/OnboardingBanner.js';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/stories',             label: 'User Stories', icon: '📋' },
  { to: '/history',             label: 'Historique',   icon: '🕐' },
  { to: '/settings/connections',label: 'Connexions',   icon: '🔌' },
  { to: '/settings/llm',        label: 'LLM',          icon: '🤖' },
  { to: '/settings/team',       label: 'Équipe',       icon: '👥' },
  { to: '/settings/billing',    label: 'Abonnement',   icon: '💳' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  const handleSignOut = () => void supabase.auth.signOut();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-blue-600">🔧 TestForge</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-xs">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="truncate flex-1">{user?.email ?? ''}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full mt-1 px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <OnboardingBanner />
        {children}
      </main>
    </div>
  );
}
