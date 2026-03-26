import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import { OnboardingBanner } from '../onboarding/OnboardingBanner.js';
import { OnboardingWizard } from '../onboarding/OnboardingWizard.js';
import { useOnboardingState } from '../../hooks/useOnboardingState.js';
import { Logo } from '../ui/Logo.js';
import { Button } from '../ui/button.js';
import {
  LayoutGrid,
  Clock,
  Plug,
  Bot,
  GitBranch,
  BarChart2,
  FileCode,
  Users,
  CreditCard,
  ShieldCheck,
} from '../ui/icons.js';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const navSections: Array<{ label: string | null; items: NavItem[] }> = [
  {
    label: null,
    items: [
      { to: '/stories',  label: 'User Stories', Icon: LayoutGrid },
      { to: '/history',  label: 'Historique',   Icon: Clock },
      { to: '/analytics', label: 'Dashboard',    Icon: BarChart2 },
    ],
  },
  {
    label: 'Paramètres',
    items: [
      { to: '/settings/connections',    label: 'Connexions',    Icon: Plug },
      { to: '/settings/llm',            label: 'LLM',           Icon: Bot },
      { to: '/settings/git',            label: 'Git',           Icon: GitBranch },
      { to: '/settings/analytics',      label: 'Analytics',     Icon: BarChart2 },
      { to: '/settings/pom-registry',   label: 'Registre POM',  Icon: FileCode },
      { to: '/settings/pom-templates',  label: 'Templates POM', Icon: FileCode },
      { to: '/settings/team',           label: 'Équipe',        Icon: Users },
      { to: '/settings/billing',        label: 'Abonnement',    Icon: CreditCard },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/super-admin', label: 'Super Admin', Icon: ShieldCheck },
    ],
  },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const { showWizard, hasConnection, hasLLM, hasFirstAnalysis } = useOnboardingState();

  const handleSignOut = () => void supabase.auth.signOut();

  return (
    <div className="flex h-screen bg-gray-50">
      {showWizard && (
        <OnboardingWizard
          hasConnection={hasConnection}
          hasLLM={hasLLM}
          hasFirstAnalysis={hasFirstAnalysis}
          onComplete={() => window.location.reload()}
        />
      )}
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-200">
          <Logo size={26} showText />
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
                          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.Icon size={16} className="shrink-0" />
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-medium text-xs">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="truncate flex-1">{user?.email ?? ''}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full mt-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 justify-start"
          >
            Se déconnecter
          </Button>
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
