import { Link } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.js';
import { ProviderLogo } from '../components/ui/ProviderLogo.js';

const SCORE_DIMENSIONS = [
  { label: 'Clarté', pct: 85, color: 'bg-blue-500' },
  { label: 'Complétude', pct: 60, color: 'bg-blue-400' },
  { label: 'Testabilité', pct: 72, color: 'bg-cyan-500' },
  { label: 'Edge cases', pct: 45, color: 'bg-amber-400' },
  { label: "Critères d'acceptance", pct: 90, color: 'bg-cyan-400' },
];

const SUGGESTIONS = [
  { label: 'Critique', text: "Préciser le comportement en cas d'email invalide", color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
  { label: 'Recommandé', text: 'Ajouter un critère sur le verrouillage du compte', color: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-400' },
  { label: 'Optionnel', text: 'Mentionner le timeout de session', color: 'bg-gray-50 border-gray-200 text-gray-500', dot: 'bg-gray-400' },
];

const PERSONAS = [
  { emoji: '🧪', name: 'Sarah — QA Engineer', pain: '2h par US à structurer du code de test', gain: '15 minutes, code prêt à merger' },
  { emoji: '📋', name: 'Marc — Product Owner', pain: 'US trop vagues → sprint review raté', gain: 'Score qualité + version améliorée avant le planning' },
  { emoji: '🛠', name: 'Thomas — Tech Lead', pain: 'Tests IA = dette technique systématique', gain: 'Architecture POM respectée dès le départ' },
];

const FRAMEWORKS: Array<{ group: 'playwright' | 'selenium' | 'cypress'; label: string; items: string[] }> = [
  { group: 'playwright', label: 'Playwright',  items: ['TypeScript', 'JavaScript', 'Python', 'Java', 'C#'] },
  { group: 'selenium',   label: 'Selenium',    items: ['Java', 'Python', 'C# (NUnit)', 'Ruby (RSpec)', 'Kotlin (JUnit 5)'] },
  { group: 'cypress',    label: 'Cypress',     items: ['JavaScript', 'TypeScript'] },
];

const LLM_PROVIDERS = [
  { name: 'OpenAI', model: 'GPT-4o', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { name: 'Azure OpenAI', model: 'Tenant privé', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { name: 'Claude', model: 'Anthropic', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { name: 'Mistral', model: 'Mistral AI', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { name: 'Ollama', model: 'On-premise', color: 'text-gray-700 bg-gray-50 border-gray-200' },
];

const INTEGRATIONS = [
  {
    icon: '🔀',
    title: 'Push vers Git',
    desc: 'Commit ou Pull Request directement vers GitHub, GitLab ou Azure Repos, sur une branche dédiée.',
    badge: 'Plan Pro',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon: '✍️',
    title: 'Writeback Jira / ADO',
    desc: "Publiez la version améliorée de l'US directement dans Jira ou Azure DevOps en un clic.",
    badge: 'Plan Pro',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon: '🧾',
    title: 'Xray (Jira)',
    desc: "Créez des Tests Xray liés à votre US avec les critères d'acceptance transformés en Test Steps.",
    badge: 'Plan Pro',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon: '📐',
    title: 'ADO Test Plans',
    desc: 'Créez des Test Cases ADO rattachés au Test Suite du sprint courant, prêts pour vos cycles de test.',
    badge: 'Plan Pro',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon: '🧩',
    title: 'Templates POM',
    desc: "Définissez un template de Page Object pour votre équipe — imports, classe de base, style de nommage.",
    badge: 'Starter & Pro',
    badgeColor: 'bg-gray-50 text-gray-600 border-gray-200',
  },
  {
    icon: '🔒',
    title: 'Azure OpenAI privé',
    desc: 'Toutes vos requêtes LLM transitent exclusivement par votre propre tenant Azure. Zéro donnée externe.',
    badge: 'Plan Pro',
    badgeColor: 'bg-blue-50 text-blue-600 border-blue-100',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafbfd] text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Logo size={28} showText />
          <div className="flex items-center gap-3">
            <Link to="/docs" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Documentation</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">Se connecter</Link>
            <Link to="/register" className="text-sm font-semibold bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              Essai gratuit →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-blue-50 via-blue-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-32 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-48 left-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-40" />
        </div>
        <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-24">
          <div className="inline-block mb-6 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700 tracking-wide">
            Jira · Azure DevOps · Playwright · Selenium · Cypress · OpenAI · Claude · Mistral · Ollama
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Vos user stories méritent
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              des tests à la hauteur
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TestForge score la qualité de vos US, suggère des améliorations concrètes, génère des cas de
            test manuels <em>et</em> des tests automatisés avec une architecture professionnelle — POM, fixtures,
            données externalisées.
            <br />
            <strong className="text-gray-700">2 heures → 15 minutes.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 text-sm">
              Démarrer l'essai gratuit — 14 jours
            </Link>
            <a href="#pipeline" className="px-6 py-3.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Comment ça marche ↓
            </a>
          </div>
          <p className="mt-5 text-xs text-gray-400">Sans carte bancaire · Données hébergées en Europe</p>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section id="pipeline" className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Un pipeline en 4 étapes</h2>
        <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
          De l'import Jira au test mergé — sans copier-coller, sans boilerplate.
        </p>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { icon: '🔌', step: '1', title: 'Connectez', desc: 'Jira ou Azure DevOps en 2 minutes. Vos US apparaissent instantanément.', highlight: false },
            { icon: '🔍', step: '2', title: 'Analysez', desc: "Score 0–100 sur 5 dimensions + suggestions + version améliorée de l'US.", highlight: true },
            { icon: '📋', step: '3', title: 'Tests manuels', desc: 'Cas de test structurés prêts pour Xray ou ADO Test Plans.', highlight: false },
            { icon: '⚡', step: '4', title: 'Automatisez', desc: 'Playwright, Selenium ou Cypress avec POM, fixtures, données externalisées.', highlight: false },
          ].map((s) => (
            <div key={s.step} className={`relative rounded-2xl p-6 border transition-all ${s.highlight ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-200/30' : 'bg-white border-gray-200/80 hover:border-blue-200 hover:shadow-md'}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{s.icon}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.highlight ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>ÉTAPE {s.step}</span>
              </div>
              <h3 className={`text-base font-bold mb-1.5 ${s.highlight ? 'text-white' : ''}`}>{s.title}</h3>
              <p className={`text-sm leading-relaxed ${s.highlight ? 'text-blue-100' : 'text-gray-500'}`}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scoring ── */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block mb-3 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full tracking-wide">ANALYSE QUALITÉ</span>
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Un score, pas une opinion</h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                Chaque user story est évaluée sur <strong className="text-gray-700">5 dimensions objectives</strong>.
                Si le score est trop bas, la génération est déconseillée — et vous savez exactement ce qui manque.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { range: '0 – 39', label: 'Trop vague', dot: 'bg-red-500', color: 'bg-red-100 text-red-700', desc: 'Génération déconseillée, liste des problèmes affichée' },
                  { range: '40 – 70', label: 'Améliorable', dot: 'bg-amber-400', color: 'bg-amber-100 text-amber-700', desc: 'Génération possible avec avertissement' },
                  { range: '71 – 100', label: 'Prête', dot: 'bg-green-500', color: 'bg-green-100 text-green-700', desc: 'Génération recommandée, qualité maximale' },
                ].map((t) => (
                  <div key={t.range} className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${t.dot}`} />
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${t.color}`}>{t.range} — {t.label}</span>
                      <span className="text-xs text-gray-400">{t.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <span className="text-xl">✨</span>
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-0.5">Version améliorée automatique</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Quel que soit le score, TestForge génère une version réécrite de l'US avec description complète
                    et critères d'acceptance numérotés. Éditez-la et publiez-la dans Jira en un clic.
                  </p>
                </div>
              </div>
            </div>

            {/* Score widget */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Score global — US-42</p>
                  <p className="text-4xl font-bold text-gray-900">72 <span className="text-base font-normal text-gray-400">/ 100</span></p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700">🟢 Prête</span>
              </div>
              <div className="space-y-2.5">
                {SCORE_DIMENSIONS.map((d) => (
                  <div key={d.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="font-medium text-gray-700">{d.pct}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggestions</p>
                {SUGGESTIONS.map((s) => (
                  <div key={s.text} className={`flex items-start gap-2 text-xs border rounded-lg px-3 py-2 ${s.color}`}>
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div><span className="font-semibold mr-1">{s.label} —</span>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tests manuels → auto ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Du cas de test manuel à l'automatisation</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          TestForge génère d'abord des cas de test structurés, puis en dérive les tests automatisés.
          La même logique, deux niveaux de couverture.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-7 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-bold text-base">Cas de test manuels</h3>
                <p className="text-xs text-gray-400">Traçabilité US ↔ Test</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <div className="text-gray-500 font-bold">TC-001 — Happy path</div>
              <div className="space-y-1 text-gray-600">
                <div><span className="text-blue-500">1.</span> Ouvrir /login</div>
                <div><span className="text-blue-500">2.</span> Saisir email + mot de passe valides</div>
                <div><span className="text-blue-500">3.</span> Cliquer "Se connecter"</div>
                <div className="text-green-600">→ Redirection vers /dashboard</div>
              </div>
              <div className="text-gray-500 font-bold pt-1">TC-002 — Email invalide</div>
              <div className="space-y-1 text-gray-600">
                <div><span className="text-blue-500">1.</span> Saisir un email mal formaté</div>
                <div className="text-red-500">→ Message d'erreur "Email invalide"</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1 rounded-full font-medium">Xray (Jira)</span>
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">ADO Test Plans</span>
              <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full font-medium">Export CSV</span>
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex gap-1.5 mr-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              </div>
              <span className="text-xs text-gray-400 px-2.5 py-0.5 bg-gray-700 rounded-md">login.spec.ts</span>
              <span className="text-xs text-gray-500">Login.page.ts</span>
              <span className="text-xs text-gray-500">fixtures/login.json</span>
            </div>
            <pre className="px-5 py-4 text-[12px] leading-relaxed overflow-x-auto text-gray-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <code>{`import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/Login.page';
import loginData from '../fixtures/login.json';

test.describe('US-42 — Authentification', () => {

  test('Happy path — connexion valide', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      loginData.validUser.email,
      loginData.validUser.password
    );
    await expect(page).toHaveURL('/dashboard');
  });

  test("Email invalide → message d'erreur", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('not-an-email', loginData.validUser.password);
    await expect(loginPage.errorMessage)
      .toContainText('Email invalide');
  });

});`}</code>
            </pre>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          POM · data-testid · JSDoc · Fixtures externalisées · 0 XPath fragile
        </p>
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
                  <p className="text-red-500/80"><span className="font-medium">Avant :</span> {p.pain}</p>
                  <p className="text-green-600"><span className="font-medium">Après :</span> {p.gain}</p>
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
          12 combinaisons supportées — même US, même analyse, même qualité d'architecture.
        </p>
        <div className="grid sm:grid-cols-3 gap-5">
          {FRAMEWORKS.map((fw) => (
            <div key={fw.group} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ProviderLogo provider={fw.group} size={20} />
                <h3 className="font-bold text-sm text-gray-900">{fw.label}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {fw.items.map((lang) => (
                  <span key={lang} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LLM Providers ── */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">Votre LLM, vos règles</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Cloud, tenant privé ou modèle local on-premise — branchez le provider que votre équipe préfère
            sans toucher à votre config.
          </p>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {LLM_PROVIDERS.map((p) => (
              <div key={p.name} className={`rounded-2xl border p-5 flex flex-col gap-1 ${p.color}`}>
                <span className="text-sm font-bold">{p.name}</span>
                <span className="text-xs opacity-70">{p.model}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Abstraction multi-provider — changez de modèle sans toucher à votre config.
          </p>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-3 tracking-tight">S'intègre dans votre workflow</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          TestForge ne remplace pas vos outils — il les enrichit. Poussez le code, mettez à jour l'US,
          créez les Test Cases, sans quitter l'interface.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INTEGRATIONS.map((item) => (
            <div key={item.title} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <h3 className="font-bold text-sm mb-1.5">{item.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
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
            <div className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold text-sm text-gray-500 mb-1">Trial</h3>
              <div className="text-3xl font-bold mb-1">0€</div>
              <p className="text-xs text-gray-400 mb-5">14 jours · sans CB</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Toutes les fonctionnalités</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Tous les providers LLM</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Membres illimités</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
              <h3 className="font-bold text-sm text-gray-500 mb-1">Starter</h3>
              <div className="text-3xl font-bold mb-1">49€<span className="text-base font-normal text-gray-400">/mois</span></div>
              <p className="text-xs text-gray-400 mb-5">Jusqu'à 5 membres</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>OpenAI · Claude · Mistral</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Jira + Azure DevOps</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Templates POM personnalisés</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>Historique 30 jours</li>
              </ul>
            </div>
            <div className="relative bg-blue-600 text-white rounded-2xl p-7 border border-blue-500 shadow-lg shadow-blue-200/30">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs bg-cyan-400 text-blue-900 font-bold px-3 py-0.5 rounded-full">
                Recommandé
              </span>
              <h3 className="font-bold text-sm text-blue-200 mb-1">Pro</h3>
              <div className="text-3xl font-bold mb-1">99€<span className="text-base font-normal text-blue-200">/mois</span></div>
              <p className="text-xs text-blue-200 mb-5">Membres illimités</p>
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>OpenAI · Claude · Mistral · Ollama</li>
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Azure OpenAI (tenant privé)</li>
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Push Git · Writeback · Xray · ADO Test Plans</li>
                <li className="flex items-start gap-2"><span className="text-cyan-300 mt-0.5">✓</span>Historique 90 jours</li>
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
          <Link to="/register" className="inline-block px-8 py-4 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
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
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link to="/login" className="hover:text-white transition-colors">Connexion</Link>
            <Link to="/register" className="hover:text-white transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
