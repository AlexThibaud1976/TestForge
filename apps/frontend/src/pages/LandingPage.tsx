import { Link } from 'react-router-dom';

const STEPS = [
  {
    icon: '🔌',
    title: 'Connectez',
    desc: 'Reliez Jira ou Azure DevOps en 2 minutes. Vos user stories apparaissent instantanément.',
  },
  {
    icon: '🔍',
    title: 'Analysez',
    desc: 'Score de qualité en 5 dimensions. Suggestions concrètes pour rendre vos US testables.',
  },
  {
    icon: '⚡',
    title: 'Générez',
    desc: 'Tests Playwright ou Selenium avec POM, fixtures et données externalisées. Prêts à merger.',
  },
];

const PERSONAS = [
  {
    emoji: '🧪',
    name: 'Sarah — QA Engineer',
    pain: '2h par US à structurer du code de test',
    gain: '15 minutes, code prêt à merger',
  },
  {
    emoji: '📋',
    name: 'Marc — Product Owner',
    pain: 'US trop vagues → sprint review raté',
    gain: 'Score qualité + suggestions avant le planning',
  },
  {
    emoji: '🛠',
    name: 'Thomas — Tech Lead',
    pain: 'Tests IA = dette technique systématique',
    gain: 'Architecture POM respectée dès le départ',
  },
];

const FRAMEWORKS = [
  { name: 'Playwright', langs: 'TS · JS · Python · Java' },
  { name: 'Selenium v4', langs: 'Java · Python' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafbfd] text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Google Font import */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-blue-600">🔧 TestForge</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              Essai gratuit →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-blue-50 via-blue-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-32 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-48 left-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
          <div className="inline-block mb-6 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700 tracking-wide">
            Playwright · Selenium · POM · Fixtures · Multi-provider LLM
          </div>

          <h1
            className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Vos user stories méritent
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              des tests à la hauteur
            </span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TestForge analyse la qualité de vos US Jira et Azure DevOps, puis génère des tests
            automatisés avec une architecture professionnelle — POM, fixtures, données externalisées.
            <br />
            <strong className="text-gray-700">2 heures → 15 minutes.</strong>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 text-sm"
            >
              Démarrer l'essai gratuit — 14 jours
            </Link>
            <a
              href="#how-it-works"
              className="px-6 py-3.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Comment ça marche ↓
            </a>
          </div>

          <p className="mt-5 text-xs text-gray-400">Sans carte bancaire · Données hébergées en Europe</p>
        </div>
      </section>

      {/* ── Code preview teaser ── */}
      <section className="max-w-5xl mx-auto px-6 -mt-4 mb-20">
        <div className="rounded-2xl border border-gray-200/80 shadow-2xl shadow-gray-200/40 overflow-hidden bg-gray-900">
          {/* Tab bar */}
          <div className="flex items-center gap-2 px-5 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex gap-1.5 mr-4">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
            <span className="text-xs text-gray-400 px-3 py-1 bg-gray-700 rounded-md">Login.page.ts</span>
            <span className="text-xs text-gray-500 px-3 py-1">login.spec.ts</span>
            <span className="text-xs text-gray-500 px-3 py-1">fixtures/login.json</span>
          </div>
          {/* Code */}
          <pre
            className="px-6 py-5 text-[13px] leading-relaxed overflow-x-auto text-gray-300"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <code>{`import { type Page, type Locator } from '@playwright/test';

/**
 * Page Object for Login page
 * Generated by TestForge from US-42
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByRole('button', { name: 'Se connecter' });
  }

  /** Navigates to the login page */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }
}`}</code>
          </pre>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          ↑ Code généré automatiquement — POM, data-testid, JSDoc, 0 XPath
        </p>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">3 étapes. 15 minutes.</h2>
        <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
          De la user story Jira au test Playwright mergé, sans copier-coller ni boilerplate.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative bg-white border border-gray-200/80 rounded-2xl p-7 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full tracking-wide">
                  ÉTAPE {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For whom ── */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Conçu pour toute l'équipe</h2>
          <p className="text-center text-gray-500 mb-14">QA, PO et Tech Leads — chacun y trouve son compte.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {PERSONAS.map((p) => (
              <div key={p.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <span className="text-4xl block mb-4">{p.emoji}</span>
                <h3 className="font-bold text-sm mb-3">{p.name}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-red-500/80">
                    <span className="font-medium">Avant :</span> {p.pain}
                  </p>
                  <p className="text-green-600">
                    <span className="font-medium">Après :</span> {p.gain}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Frameworks ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Vos frameworks, votre langage</h2>
        <p className="text-center text-gray-500 mb-10">
          Même US, même analyse — le framework et le langage changent, pas la qualité.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {FRAMEWORKS.map((fw) => (
            <div
              key={fw.name}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm"
            >
              <span className="text-sm font-bold text-gray-900">{fw.name}</span>
              <span className="text-xs text-gray-400 border-l border-gray-200 pl-3">{fw.langs}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Tarifs simples</h2>
          <p className="text-center text-gray-500 mb-12">Par équipe, par mois. Commencez gratuitement.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Trial */}
            <div className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold text-sm text-gray-500 mb-1">Trial</h3>
              <div className="text-3xl font-bold mb-1">0€</div>
              <p className="text-xs text-gray-400 mb-5">14 jours · sans CB</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Toutes les fonctionnalités</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Tous les providers LLM</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Jusqu'à 3 membres</li>
              </ul>
            </div>

            {/* Starter */}
            <div className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold text-sm text-gray-500 mb-1">Starter</h3>
              <div className="text-3xl font-bold mb-1">
                49€<span className="text-base font-normal text-gray-400">/mois</span>
              </div>
              <p className="text-xs text-gray-400 mb-5">Jusqu'à 5 membres</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>OpenAI (GPT-4o)</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Jira + Azure DevOps</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Historique illimité</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="relative bg-blue-600 text-white rounded-2xl p-7 border border-blue-500 shadow-lg shadow-blue-200/30">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-cyan-400 text-blue-900 font-bold px-3 py-0.5 rounded-full">
                Recommandé
              </span>
              <h3 className="font-bold text-sm text-blue-200 mb-1">Pro</h3>
              <div className="text-3xl font-bold mb-1">
                99€<span className="text-base font-normal text-blue-200">/mois</span>
              </div>
              <p className="text-xs text-blue-200 mb-5">Membres illimités</p>
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Tous les providers LLM</li>
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Azure OpenAI (tenant privé)</li>
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Support prioritaire</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust / Security ── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <div>
            <span className="text-2xl block mb-2">🇪🇺</span>
            <p className="text-sm font-medium text-gray-800">Hébergement EU</p>
            <p className="text-xs text-gray-400">Supabase EU · Railway EU</p>
          </div>
          <div>
            <span className="text-2xl block mb-2">🔒</span>
            <p className="text-sm font-medium text-gray-800">Chiffrement AES-256</p>
            <p className="text-xs text-gray-400">Vos credentials jamais en clair</p>
          </div>
          <div>
            <span className="text-2xl block mb-2">🚫</span>
            <p className="text-sm font-medium text-gray-800">Vos données vous appartiennent</p>
            <p className="text-xs text-gray-400">Aucun usage pour l'entraînement</p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20">
        <div className="absolute inset-0 -z-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Prêt à transformer vos user stories en tests ?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            14 jours gratuits, sans carte bancaire. Configurez en 5 minutes, générez votre premier test en 10.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm"
          >
            Créer mon espace équipe gratuitement
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-gray-300">🔧 TestForge</span>
          <p className="text-xs">© 2026 TestForge · Montpellier, France · Données hébergées en Europe</p>
          <div className="flex gap-4 text-xs">
            <Link to="/login" className="hover:text-white transition-colors">Connexion</Link>
            <Link to="/register" className="hover:text-white transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
