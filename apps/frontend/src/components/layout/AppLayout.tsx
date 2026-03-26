import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { OnboardingBanner } from '../onboarding/OnboardingBanner.js';

interface AppLayoutProps {
  children: ReactNode;
}

const navSections = [
  {
    label: null,
    items: [
      { to: '/stories', label: 'User Stories', icon: '📋' },
      { to: '/history', label: 'Historique',   icon: '🕐' },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { to: '/settings/connections',   label: 'Connexions',     icon: '🔌' },
      { to: '/settings/llm',           label: 'LLM',            icon: '🤖' },
      { to: '/settings/git',           label: 'Git',            icon: '↑' },
      { to: '/settings/analytics',    label: 'Analytics',      icon: '📊' },
      { to: '/settings/pom-registry', label: 'Registre POM',   icon: '🗂' },
      { to: '/settings/pom-templates', label: 'Templates POM',  icon: '📄' },
      { to: '/settings/team',          label: 'Équipe',         icon: '👥' },
      { to: '/settings/billing',       label: 'Abonnement',     icon: '💳' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/super-admin', label: 'Super Admin', icon: '🛡' },
    ],
  },
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
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navSections.map((section, i) => (
            <div key={i}>
              {section.label && (
                <div className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
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
                    <span className="w-4 text-center">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Documentation */}
        <div className="px-3 pb-2">
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="w-4 text-center">📖</span>
            Documentation
          </a>
        </div>

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
