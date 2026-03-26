import React, { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    __setPage?: (page: string) => void;
  }
}

const CATEGORIES = [
  {
    label: "Premiers pas",
    pages: [
      { id: "welcome", title: "Bienvenue", icon: "👋" },
      { id: "quickstart", title: "Démarrage en 5 min", icon: "🚀" },
    ],
  },
  {
    label: "Fonctionnalités",
    pages: [
      { id: "connect", title: "Connecter Jira / ADO", icon: "🔌" },
      { id: "import", title: "Importer les US", icon: "📥" },
      { id: "analyze", title: "Analyser la qualité", icon: "🔍" },
      { id: "manual-tests", title: "Tests manuels", icon: "📋" },
      { id: "generate", title: "Générer les tests auto", icon: "⚡" },
      { id: "push", title: "Push Git & intégrations", icon: "📤" },
    ],
  },
  {
    label: "Configuration",
    pages: [
      { id: "llm", title: "Providers LLM", icon: "🤖" },
      { id: "team", title: "Équipe & rôles", icon: "👥" },
      { id: "billing", title: "Plans & facturation", icon: "💳" },
    ],
  },
  {
    label: "Support",
    pages: [{ id: "faq", title: "FAQ", icon: "❓" }],
  },
];

const ALL_PAGES = CATEGORIES.flatMap((c) => c.pages);

type PageItem = { id: string; title: string; icon: string };

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(18px)", transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function Tip({ type = "tip", children }: { type?: "tip" | "warning" | "info" | "pro"; children: React.ReactNode }) {
  const s = { tip: { bg: "#eef4ff", bdr: "#3b82f6", lbl: "Astuce", ic: "💡" }, warning: { bg: "#fefce8", bdr: "#eab308", lbl: "Attention", ic: "⚠️" }, info: { bg: "#f0fdf4", bdr: "#22c55e", lbl: "Bon à savoir", ic: "ℹ️" }, pro: { bg: "#f5f3ff", bdr: "#7c3aed", lbl: "Plan Pro", ic: "⭐" } }[type] || { bg: "#eef4ff", bdr: "#3b82f6", lbl: "Astuce", ic: "💡" };
  return (
    <div style={{ background: s.bg, borderLeft: `3px solid ${s.bdr}`, padding: "14px 18px", borderRadius: "0 8px 8px 0", margin: "20px 0", fontSize: "14.5px", lineHeight: 1.7 }}>
      <span style={{ fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.6px", color: s.bdr, display: "block", marginBottom: "3px" }}>{s.ic} {s.lbl}</span>
      {children}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "16px", marginBottom: "28px" }}>
      <div style={{ flexShrink: 0, width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", marginTop: "2px" }}>{n}</div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: "0 0 5px", fontWeight: 600, fontSize: "15.5px", letterSpacing: "-0.2px" }}>{title}</h4>
        <div style={{ color: "#4b5563", fontSize: "14.5px", lineHeight: 1.75 }}>{children}</div>
      </div>
    </div>
  );
}

function MockupFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FadeIn delay={0.1}>
      <div style={{ margin: "24px 0", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fca5a5" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fcd34d" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#86efac" }} />
          </div>
          <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 500, marginLeft: "4px" }}>{title}</span>
        </div>
        <div style={{ padding: "20px", background: "#fff" }}>{children}</div>
      </div>
    </FadeIn>
  );
}

function Badge({ color = "blue", children }: { color?: "blue" | "green" | "orange" | "red" | "purple" | "gray"; children: React.ReactNode }) {
  const c = { blue: { bg: "#dbeafe", t: "#1e40af" }, green: { bg: "#dcfce7", t: "#166534" }, orange: { bg: "#fef3c7", t: "#92400e" }, red: { bg: "#fee2e2", t: "#991b1b" }, purple: { bg: "#ede9fe", t: "#5b21b6" }, gray: { bg: "#f3f4f6", t: "#374151" } }[color] || { bg: "#dbeafe", t: "#1e40af" };
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, background: c.bg, color: c.t, marginRight: "5px" }}>{children}</span>;
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
      <span style={{ fontSize: "12px", color: "#6b7280", width: "90px", textAlign: "right" }}>{label}</span>
      <div style={{ flex: 1, height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.8s ease" }} />
      </div>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151", width: "28px" }}>{score}</span>
    </div>
  );
}

function MockupAnalysis() {
  return (
    <MockupFrame title="TestForge — Analyse de US-42 : Connexion utilisateur">
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 120px", textAlign: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", border: "4px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", background: "#f0fdf4" }}>
            <span style={{ fontSize: "28px", fontWeight: 700, color: "#166534" }}>72</span>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.5px" }}>Bonne qualité</span>
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <ScoreBar score={75} label="Clarté" color="#3b82f6" />
          <ScoreBar score={80} label="Complétude" color="#3b82f6" />
          <ScoreBar score={70} label="Testabilité" color="#eab308" />
          <ScoreBar score={55} label="Edge cases" color="#f97316" />
          <ScoreBar score={78} label="Critères AC" color="#3b82f6" />
        </div>
      </div>
      <div style={{ marginTop: "16px", padding: "12px 14px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fef3c7", fontSize: "13px", color: "#92400e" }}>
        <strong>Suggestion :</strong> Ajouter un scénario d'erreur pour un mot de passe expiré et une tentative de connexion avec un compte désactivé.
      </div>
    </MockupFrame>
  );
}

function MockupManualTests() {
  const tests = [
    { title: "Connexion avec identifiants valides", prio: "critical", steps: 4, status: "validated" },
    { title: "Connexion avec mot de passe incorrect", prio: "high", steps: 3, status: "validated" },
    { title: "Connexion avec compte désactivé", prio: "medium", steps: 3, status: "draft" },
  ];
  const prioColors: Record<string, string> = { critical: "#dc2626", high: "#f97316", medium: "#eab308" };
  return (
    <MockupFrame title="TestForge — Tests manuels pour US-42">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>3 cas de test · 10 steps</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <div style={{ padding: "5px 12px", borderRadius: "6px", background: "#dbeafe", color: "#1d4ed8", fontSize: "12px", fontWeight: 600 }}>Valider tout</div>
          <div style={{ padding: "5px 12px", borderRadius: "6px", background: "#ede9fe", color: "#5b21b6", fontSize: "12px", fontWeight: 600 }}>Push Xray</div>
        </div>
      </div>
      {tests.map((t, i) => (
        <div key={i} style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: prioColors[t.prio], flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 500 }}>{t.title}</div>
            <div style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" }}>{t.steps} steps · {t.prio}</div>
          </div>
          {t.status === "validated" && <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 600 }}>✓ Validé</span>}
          <span style={{ fontSize: "12px", color: "#6b7280", cursor: "pointer" }}>▸</span>
        </div>
      ))}
    </MockupFrame>
  );
}

function MockupCodeViewer() {
  return (
    <MockupFrame title="TestForge — Code généré · Playwright TypeScript">
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "12px" }}>
        {["LoginPage.page.ts", "login.spec.ts", "login.json"].map((f, i) => (
          <div key={i} style={{ padding: "8px 14px", fontSize: "12.5px", fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "#1d4ed8" : "#6b7280", borderBottom: i === 0 ? "2px solid #2563eb" : "none", cursor: "pointer" }}>{f}</div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", padding: "6px 0" }}>
          <div style={{ padding: "4px 10px", borderRadius: "5px", background: "#f3f4f6", fontSize: "11px", color: "#374151", fontWeight: 500 }}>Copier</div>
          <div style={{ padding: "4px 10px", borderRadius: "5px", background: "#2563eb", fontSize: "11px", color: "#fff", fontWeight: 500 }}>ZIP ↓</div>
        </div>
      </div>
      <div style={{ background: "#111827", borderRadius: "8px", padding: "14px 16px", fontSize: "12.5px", fontFamily: "'JetBrains Mono', monospace", color: "#d1d5db", lineHeight: 1.7, overflow: "auto" }}>
        <div><span style={{ color: "#93c5fd" }}>import</span> {"{"} <span style={{ color: "#fbbf24" }}>type Page, type Locator</span> {"}"} <span style={{ color: "#93c5fd" }}>from</span> <span style={{ color: "#86efac" }}>'@playwright/test'</span>;</div>
        <div style={{ marginTop: "10px", color: "#6b7280" }}>{"/**"}</div>
        <div style={{ color: "#6b7280" }}>{" * Page Object for Login page"}</div>
        <div style={{ color: "#6b7280" }}>{" * Generated by TestForge from US-42"}</div>
        <div style={{ color: "#6b7280" }}>{" */"}</div>
        <div><span style={{ color: "#93c5fd" }}>export class</span> <span style={{ color: "#fbbf24" }}>LoginPage</span> {"{"}</div>
        <div>{"  "}<span style={{ color: "#93c5fd" }}>readonly</span> page: <span style={{ color: "#fbbf24" }}>Page</span>;</div>
        <div>{"  "}<span style={{ color: "#93c5fd" }}>readonly</span> emailInput: <span style={{ color: "#fbbf24" }}>Locator</span>;</div>
        <div>{"  "}<span style={{ color: "#93c5fd" }}>readonly</span> passwordInput: <span style={{ color: "#fbbf24" }}>Locator</span>;</div>
        <div>{"  "}<span style={{ color: "#93c5fd" }}>readonly</span> submitBtn: <span style={{ color: "#fbbf24" }}>Locator</span>;</div>
        <div style={{ marginTop: "6px", color: "#6b7280" }}>{"  // ..."}</div>
        <div>{"}"}</div>
      </div>
      <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ padding: "3px 10px", borderRadius: "100px", background: "#dcfce7", color: "#166534", fontSize: "11px", fontWeight: 600 }}>✓ Code validé</span>
        <span style={{ padding: "3px 10px", borderRadius: "100px", background: "#dbeafe", color: "#1e40af", fontSize: "11px", fontWeight: 600 }}>@XRAY-123</span>
        <span style={{ fontSize: "11.5px", color: "#9ca3af" }}>Généré en 18s · GPT-4o</span>
      </div>
    </MockupFrame>
  );
}

function MockupScoreboard() {
  const data = [
    { title: "US-38 : Recherche produits", score: 23, color: "#dc2626" },
    { title: "US-41 : Panier d'achat", score: 45, color: "#f97316" },
    { title: "US-39 : Filtres catégorie", score: 52, color: "#f97316" },
    { title: "US-42 : Connexion utilisateur", score: 72, color: "#22c55e" },
    { title: "US-40 : Page produit", score: 78, color: "#22c55e" },
    { title: "US-43 : Mon profil", score: 85, color: "#22c55e" },
  ];
  return (
    <MockupFrame title="TestForge — Scoreboard Sprint 14">
      <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap" }}>
        <div style={{ textAlign: "center", padding: "10px 20px", background: "#f9fafb", borderRadius: "10px", flex: "1 1 0" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#374151" }}>59</div>
          <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Score moyen</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flex: "2 1 0", justifyContent: "center" }}>
          <div style={{ padding: "6px 14px", borderRadius: "8px", background: "#fee2e2", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#991b1b" }}>1</div>
            <div style={{ fontSize: "10px", color: "#991b1b" }}>critique</div>
          </div>
          <div style={{ padding: "6px 14px", borderRadius: "8px", background: "#fef3c7", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#92400e" }}>2</div>
            <div style={{ fontSize: "10px", color: "#92400e" }}>à revoir</div>
          </div>
          <div style={{ padding: "6px 14px", borderRadius: "8px", background: "#dcfce7", textAlign: "center" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#166534" }}>3</div>
            <div style={{ fontSize: "10px", color: "#166534" }}>prêtes</div>
          </div>
        </div>
      </div>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: i < data.length - 1 ? "1px solid #f3f4f6" : "none" }}>
          <span style={{ fontSize: "12.5px", color: "#6b7280", flex: "1" }}>{d.title}</span>
          <div style={{ width: "120px", height: "6px", background: "#f3f4f6", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ width: `${d.score}%`, height: "100%", background: d.color, borderRadius: "3px" }} />
          </div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: d.color, width: "28px", textAlign: "right" }}>{d.score}</span>
        </div>
      ))}
    </MockupFrame>
  );
}

const PAGES_CONTENT: Record<string, () => JSX.Element> = {
  welcome: () => (
    <>
      <h1 style={h1Style}>Bienvenue sur TestForge <span style={{ color: "#2563eb" }}>Docs</span></h1>
      <p style={leadStyle}>
        TestForge transforme vos user stories Jira et Azure DevOps en tests automatisés de qualité professionnelle. Ce guide vous montre comment en tirer le meilleur parti — que vous soyez QA, PO ou Tech Lead.
      </p>
      <FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", margin: "32px 0" }}>
          {[
            { ic: "🧪", title: "QA Engineer", desc: "Générez des tests POM en 30 secondes au lieu de 2 heures", page: "generate" },
            { ic: "📋", title: "Product Owner", desc: "Vérifiez que vos US sont assez précises pour être testées", page: "analyze" },
            { ic: "🛠", title: "Tech Lead", desc: "Du code qui respecte vos standards d'architecture dès le départ", page: "quickstart" },
          ].map((p, i) => (
            <div key={i} onClick={() => window.__setPage?.(p.page)} style={{ padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", cursor: "pointer", transition: "all 0.2s", background: "#fff" }} onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.08)"; }} onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>{p.ic}</div>
              <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "6px" }}>{p.title}</div>
              <div style={{ fontSize: "13.5px", color: "#6b7280", lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.15}>
        <h2 style={h2Style}>Le pipeline en 30 secondes</h2>
        <p style={pStyle}>TestForge fonctionne en 3 étapes. Chacune a de la valeur indépendamment — vous n'êtes pas obligé d'aller jusqu'à l'automatisation pour en profiter.</p>
        <div style={{ display: "flex", gap: "12px", margin: "20px 0", flexWrap: "wrap" }}>
          {["Connecter Jira / ADO", "Analyser les US", "Générer les tests"].map((s, i) => (
            <div key={i} style={{ flex: "1 1 0", minWidth: "160px", padding: "16px", borderRadius: "10px", background: i === 2 ? "#eff6ff" : "#f9fafb", border: `1px solid ${i === 2 ? "#bfdbfe" : "#e5e7eb"}`, textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "#2563eb", marginBottom: "4px" }}>{i + 1}</div>
              <div style={{ fontSize: "14px", fontWeight: 500 }}>{s}</div>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.25}>
        <Tip>Envie de tester tout de suite ? Suivez le <span style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }} onClick={() => window.__setPage?.("quickstart")}>guide de démarrage en 5 minutes →</span></Tip>
      </FadeIn>
    </>
  ),
  quickstart: () => (
    <>
      <h1 style={h1Style}>Démarrage en <span style={{ color: "#2563eb" }}>5 minutes</span></h1>
      <p style={leadStyle}>De l'inscription à votre premier test généré, en 3 étapes. Pas de carte bancaire, pas de configuration complexe.</p>
      <FadeIn><Step n={1} title="Créez votre espace équipe">Inscrivez-vous sur <strong>testforge.dev</strong> avec votre email pro. Vous obtenez un essai gratuit de 14 jours avec accès à toutes les fonctionnalités Pro. Choisissez un nom pour votre espace — c'est l'environnement partagé de votre équipe.</Step></FadeIn>
      <FadeIn delay={0.1}><Step n={2} title="Connectez votre source">L'assistant d'onboarding vous guide : choisissez Jira ou Azure DevOps, collez votre token, sélectionnez le projet. TestForge teste la connexion en temps réel — si ça passe, vous êtes prêt. <span style={{ color: "#2563eb", cursor: "pointer" }} onClick={() => window.__setPage?.("connect")}>Détails sur les tokens →</span></Step></FadeIn>
      <FadeIn delay={0.2}><Step n={3} title="Analysez et générez">Synchronisez vos US, ouvrez-en une, cliquez <strong>"Analyser"</strong>. En 10 secondes, vous avez un score de qualité et des suggestions. Cliquez <strong>"Générer les tests"</strong> — en 30 secondes, vous avez du code de test structuré (Playwright, Selenium ou Cypress), prêt à copier.</Step></FadeIn>
      <FadeIn delay={0.3}><Tip type="info">L'onboarding guidé s'affiche à la première connexion. Il vous prend par la main sur les 3 étapes. Si vous le fermez par accident, retrouvez-le dans Paramètres → Connexions.</Tip></FadeIn>
    </>
  ),
  connect: () => (
    <>
      <h1 style={h1Style}>Connecter <span style={{ color: "#2563eb" }}>Jira & Azure DevOps</span></h1>
      <p style={leadStyle}>TestForge se branche directement sur vos outils. Vos US apparaissent en quelques secondes, sans copier-coller, sans fichier CSV.</p>
      <FadeIn>
        <h2 style={h2Style}>Jira Cloud</h2>
        <Step n={1} title="Générez un API Token">Allez sur <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">id.atlassian.com → Security → API Tokens</a>. Créez un token et copiez-le immédiatement — Atlassian ne le réaffichera pas.</Step>
        <Step n={2} title="Ajoutez la connexion">Dans TestForge → <strong>Paramètres → Connexions → Ajouter</strong>. Renseignez votre URL Jira, votre email, et le token. Un test de connexion se lance automatiquement.</Step>
        <Step n={3} title="Sélectionnez le projet">Choisissez le projet Jira dont vous voulez les US. Vous pouvez en connecter plusieurs.</Step>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h2 style={h2Style}>Azure DevOps</h2>
        <Step n={1} title="Créez un PAT">User Settings → Personal Access Tokens → New Token. Scopes minimum : <Badge color="gray">Work Items (Read)</Badge> et <Badge color="gray">Code (Read & Write)</Badge> si vous voulez le push Git.</Step>
        <Step n={2} title="Connectez">URL de l'organisation, nom du projet, PAT. Même flow que Jira — test en temps réel.</Step>
      </FadeIn>
      <FadeIn delay={0.2}>
        <Tip type="info">Vos tokens sont chiffrés en AES-256-GCM avant stockage. Ils n'apparaissent jamais en clair — ni en base, ni dans les logs, ni dans l'interface. Si vous changez votre mot de passe Atlassian, le token Jira sera invalidé : pensez à en régénérer un.</Tip>
      </FadeIn>
    </>
  ),
  import: () => (
    <>
      <h1 style={h1Style}>Importer les <span style={{ color: "#2563eb" }}>user stories</span></h1>
      <p style={leadStyle}>Une fois connecté, un clic suffit pour remplir votre espace avec les US de votre projet. La sync est incrémentale — elle met à jour sans dupliquer.</p>
      <FadeIn>
        <Step n={1} title="Synchronisez">Depuis la page User Stories, cliquez <strong>Synchroniser</strong>. Choisissez d'importer tout le projet ou de filtrer par sprint, statut, ou labels.</Step>
        <Step n={2} title="Explorez">Les US apparaissent sous forme de cartes : titre, statut Jira/ADO, et score de qualité si déjà analysées. Le filtre texte cherche dans le titre et la description.</Step>
        <Tip>La sync est incrémentale : si une US a changé dans Jira, elle est mise à jour dans TestForge. Les US supprimées dans Jira restent visibles ici (pas de suppression automatique — vos analyses sont préservées).</Tip>
        <Tip type="pro">Sur le plan Pro, filtrez directement au moment de la sync : sprint actif uniquement, statuts spécifiques, labels. Ça évite de charger 500 US quand vous n'en avez besoin que de 12.</Tip>
      </FadeIn>
    </>
  ),
  analyze: () => (
    <>
      <h1 style={h1Style}>Analyser la <span style={{ color: "#2563eb" }}>qualité des US</span></h1>
      <p style={leadStyle}>Le moteur d'analyse passe chaque US au crible sur 5 dimensions. Vous savez en 10 secondes si une US est prête pour les tests ou si elle a besoin d'un coup de polish.</p>
      <FadeIn><MockupAnalysis /></FadeIn>
      <FadeIn delay={0.1}>
        <h2 style={h2Style}>Les 5 dimensions</h2>
        <p style={pStyle}>Chaque US reçoit un score sur 100, composé de 5 sous-scores :</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "12px 0 24px" }}>
          {[
            { n: "Clarté", d: "L'US est-elle compréhensible sans ambiguïté ?" },
            { n: "Complétude", d: "Tous les cas d'usage sont-ils couverts ?" },
            { n: "Testabilité", d: "Peut-on écrire un test concret pour chaque AC ?" },
            { n: "Edge cases", d: "Les scénarios limites sont-ils identifiés ?" },
            { n: "Critères d'acceptance", d: "Les AC sont-ils précis et mesurables ?" },
          ].map((d, i) => (
            <div key={i} style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" }}>
              <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "3px" }}>{d.n}</div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>{d.d}</div>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.15}>
        <h2 style={h2Style}>Comprendre le score</h2>
        <div style={{ display: "flex", gap: "10px", margin: "12px 0 20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 0", padding: "10px 14px", borderRadius: "8px", background: "#fee2e2" }}>
            <div style={{ fontWeight: 700, color: "#991b1b", fontSize: "18px" }}>0 — 39</div>
            <div style={{ fontSize: "12px", color: "#991b1b" }}>À retravailler avant toute génération</div>
          </div>
          <div style={{ flex: "1 1 0", padding: "10px 14px", borderRadius: "8px", background: "#fef3c7" }}>
            <div style={{ fontWeight: 700, color: "#92400e", fontSize: "18px" }}>40 — 69</div>
            <div style={{ fontSize: "12px", color: "#92400e" }}>Acceptable, génération possible avec réserves</div>
          </div>
          <div style={{ flex: "1 1 0", padding: "10px 14px", borderRadius: "8px", background: "#dcfce7" }}>
            <div style={{ fontWeight: 700, color: "#166534", fontSize: "18px" }}>70 — 100</div>
            <div style={{ fontSize: "12px", color: "#166534" }}>Qualité pro, feu vert pour les tests</div>
          </div>
        </div>
      </FadeIn>
      <FadeIn delay={0.2}>
        <h2 style={h2Style}>Analyse en lot</h2>
        <p style={pStyle}>Pourquoi analyser une US à la fois quand vous pouvez scorer tout le sprint ? Sélectionnez vos US (ou cliquez "Analyser tout le sprint") et obtenez un tableau de bord comparatif en 30 secondes.</p>
        <MockupScoreboard />
        <p style={pStyle}>Le scoreboard trie les US du plus faible score au plus fort. En un coup d'œil, vous savez lesquelles retravailler en refinement.</p>
        <Tip type="pro">Le writeback vous permet de renvoyer la version améliorée directement dans Jira ou ADO — un clic, et l'US est mise à jour dans la source.</Tip>
      </FadeIn>
    </>
  ),
  "manual-tests": () => (
    <>
      <h1 style={h1Style}>Tests <span style={{ color: "#2563eb" }}>manuels</span></h1>
      <p style={leadStyle}>Avant de générer du code, transformez vos critères d'acceptance en cas de test manuels structurés. C'est la porte de validation humaine — et c'est utile même sans automatisation.</p>
      <FadeIn><MockupManualTests /></FadeIn>
      <FadeIn delay={0.1}>
        <h2 style={h2Style}>Le flux en 4 temps</h2>
        <Step n={1} title="Générer">Cliquez "Générer tests manuels" sur une US analysée. TestForge transforme chaque AC en cas de test avec des steps clairs : action → résultat attendu. Le happy path et les cas d'erreur sont couverts automatiquement.</Step>
        <Step n={2} title="Éditer">Modifiez directement dans TestForge : ajoutez un step, reformulez une action, supprimez un cas non pertinent. Tout se fait en édition inline, pas besoin d'ouvrir un autre outil.</Step>
        <Step n={3} title="Valider">Le QA ou le PO marque le lot comme "validé". C'est un point de checkpoint — la date et l'auteur sont enregistrés. Ce n'est pas obligatoire, mais fortement recommandé avant de passer aux tests auto.</Step>
        <Step n={4} title="Pousser vers Xray / ADO">Les tests validés sont créés comme Tests Xray (avec steps) ou Test Cases ADO, automatiquement liés à l'US source. Chaque test affiche son ID externe dans TestForge.</Step>
      </FadeIn>
      <FadeIn delay={0.2}>
        <Tip type="info">Les tests manuels ont de la valeur même sans automatisation. Si votre équipe ne fait pas d'automatisation aujourd'hui, TestForge structure quand même vos tests manuels dans Xray ou ADO — et quand vous serez prêts pour l'automatisation, le lien sera déjà en place.</Tip>
      </FadeIn>
    </>
  ),
  generate: () => (
    <>
      <h1 style={h1Style}>Générer les <span style={{ color: "#2563eb" }}>tests automatisés</span></h1>
      <p style={leadStyle}>Le cœur de TestForge : du code de test professionnel, structuré, prêt à merger. Pas du code jetable — du code que votre Tech Lead approvera en code review.</p>
      <FadeIn><MockupCodeViewer /></FadeIn>
      <FadeIn delay={0.1}>
        <h2 style={h2Style}>Ce que vous obtenez</h2>
        <p style={pStyle}>Pour chaque US, TestForge génère 3 fichiers qui forment une suite de test complète :</p>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px 20px", margin: "12px 0 20px", fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", lineHeight: 2, color: "#374151" }}>
          <div>📁 pages/</div>
          <div style={{ paddingLeft: "20px", color: "#2563eb", fontWeight: 500 }}>└── LoginPage.page.ts <span style={{ color: "#9ca3af", fontWeight: 400 }}>— locateurs + actions</span></div>
          <div>📁 tests/</div>
          <div style={{ paddingLeft: "20px", color: "#2563eb", fontWeight: 500 }}>└── login.spec.ts <span style={{ color: "#9ca3af", fontWeight: 400 }}>— scénarios happy path + erreurs</span></div>
          <div>📁 fixtures/</div>
          <div style={{ paddingLeft: "20px", color: "#2563eb", fontWeight: 500 }}>└── login.json <span style={{ color: "#9ca3af", fontWeight: 400 }}>— données de test externalisées</span></div>
        </div>
      </FadeIn>
      <FadeIn delay={0.15}>
        <h2 style={h2Style}>Frameworks supportés</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", margin: "8px 0 20px" }}>
          <thead><tr style={{ borderBottom: "2px solid #e5e7eb" }}><th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Framework</th><th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Langages</th></tr></thead>
          <tbody>
            {[{ f: "Playwright", l: "TypeScript, JavaScript, Python, Java, C#" }, { f: "Selenium v4", l: "Java, Python, C#, Ruby, Kotlin" }, { f: "Cypress", l: "JavaScript, TypeScript" }].map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.f}</td><td style={{ padding: "10px 12px", color: "#4b5563" }}>{r.l}</td></tr>
            ))}
          </tbody>
        </table>
      </FadeIn>
      <FadeIn delay={0.2}>
        <h2 style={h2Style}>Les principes de qualité</h2>
        <p style={pStyle}>Chaque fichier généré respecte ces standards — c'est ce qui différencie TestForge des copilots génériques :</p>
        <ul style={{ color: "#4b5563", lineHeight: 2, paddingLeft: "18px", fontSize: "14.5px" }}>
          <li><strong>Page Object Model</strong> — une classe par page, sélecteurs isolés</li>
          <li><strong>Sélecteurs fiables</strong> — <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", fontSize: "13px" }}>data-testid</code> et <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", fontSize: "13px" }}>getByRole()</code> en priorité</li>
          <li><strong>Données externalisées</strong> — toutes les valeurs dans les fixtures, jamais en dur</li>
          <li><strong>Couverture</strong> — happy path + au moins 2 cas d'erreur</li>
          <li><strong>Documentation</strong> — JSDoc sur chaque méthode POM</li>
        </ul>
      </FadeIn>
      <FadeIn delay={0.25}><Tip>Si vous avez des tests manuels validés avec des IDs Xray ou ADO, cochez "Lier aux tests manuels" lors de la génération. Le code contiendra les annotations <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", fontSize: "13px" }}>@XRAY-123</code> pour une traçabilité complète.</Tip></FadeIn>
    </>
  ),
  push: () => (
    <>
      <h1 style={h1Style}>Push Git & <span style={{ color: "#2563eb" }}>intégrations</span></h1>
      <p style={leadStyle}>Poussez vos tests vers GitHub, GitLab ou Azure Repos en un clic. En commit direct ou en Pull Request — votre CI/CD prend le relais.</p>
      <FadeIn>
        <h2 style={h2Style}>Push Git</h2>
        <Step n={1} title="Configurez un repo">Paramètres → Git → Ajouter. URL HTTPS, token PAT, branche par défaut.</Step>
        <Step n={2} title="Choisissez le mode">Après une génération, cliquez "Push vers Git". Deux options : <Badge>Commit direct</Badge> ou <Badge color="purple">Créer une PR</Badge>.</Step>
        <Step n={3} title="C'est parti">TestForge crée une branche <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", fontSize: "13px" }}>testforge/US-42-login</code> avec les fichiers. Le lien vers le commit ou la PR s'affiche directement.</Step>
      </FadeIn>
      <FadeIn delay={0.1}>
        <h2 style={h2Style}>Xray Cloud (Jira)</h2>
        <p style={pStyle}>Configurez la connexion dans Paramètres → Xray avec votre Client ID et Client Secret. Les tests créés apparaissent comme Tests Xray liés à l'US source, avec les steps pré-remplis.</p>
        <h2 style={h2Style}>ADO Test Plans</h2>
        <p style={pStyle}>Si votre connexion ADO a les droits Test Plans, TestForge crée des Test Cases liés aux US avec les steps. Rattachement automatique au Test Suite du sprint courant.</p>
        <Tip type="pro">Push Git, Xray et ADO Test Plans sont disponibles sur le plan Pro.</Tip>
      </FadeIn>
    </>
  ),
  llm: () => (
    <>
      <h1 style={h1Style}>Providers <span style={{ color: "#2563eb" }}>LLM</span></h1>
      <p style={leadStyle}>Vous choisissez le cerveau derrière TestForge. Chaque équipe configure son provider — et peut en changer à tout moment sans perdre son historique.</p>
      <FadeIn>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", margin: "16px 0 24px" }}>
          <thead><tr style={{ borderBottom: "2px solid #e5e7eb" }}><th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Provider</th><th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Modèle recommandé</th><th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600 }}>Plan</th></tr></thead>
          <tbody>
            {[{ p: "OpenAI", m: "GPT-4o", pl: "Starter / Pro" }, { p: "Azure OpenAI", m: "GPT-4o (votre tenant)", pl: "Starter / Pro" }, { p: "Anthropic", m: "Claude Sonnet 4", pl: "Starter / Pro" }, { p: "Mistral AI", m: "Mistral Large", pl: "Pro" }, { p: "Ollama", m: "Llama 3, Mixtral...", pl: "Pro" }].map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "10px 12px", fontWeight: 500 }}>{r.p}</td><td style={{ padding: "10px 12px", color: "#4b5563" }}>{r.m}</td><td style={{ padding: "10px 12px" }}><Badge color={r.pl === "Pro" ? "purple" : "blue"}>{r.pl}</Badge></td></tr>
            ))}
          </tbody>
        </table>
        <Tip>Azure OpenAI est idéal pour les entreprises qui veulent garder leurs données dans leur tenant Azure. Le trafic ne passe jamais par les serveurs OpenAI.</Tip>
        <Tip type="info">Ollama vous permet d'exécuter le LLM localement — zéro donnée qui quitte votre réseau. Renseignez l'URL de votre serveur (ex: <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: "4px", fontSize: "13px" }}>http://localhost:11434</code>) et le nom du modèle.</Tip>
      </FadeIn>
    </>
  ),
  team: () => (
    <>
      <h1 style={h1Style}>Équipe & <span style={{ color: "#2563eb" }}>rôles</span></h1>
      <p style={leadStyle}>TestForge est multi-tenant : chaque équipe a son propre espace isolé. Vos données ne croisent jamais celles d'une autre équipe.</p>
      <FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", margin: "16px 0 24px" }}>
          <div style={{ padding: "20px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            <Badge color="blue">Admin</Badge>
            <ul style={{ margin: "12px 0 0", paddingLeft: "16px", fontSize: "13.5px", color: "#4b5563", lineHeight: 2 }}>
              <li>Configure les connexions et le LLM</li>
              <li>Gère les membres et invitations</li>
              <li>Gère l'abonnement</li>
              <li>Analyse et génère des tests</li>
            </ul>
          </div>
          <div style={{ padding: "20px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
            <Badge color="gray">Membre</Badge>
            <ul style={{ margin: "12px 0 0", paddingLeft: "16px", fontSize: "13.5px", color: "#4b5563", lineHeight: 2 }}>
              <li>Analyse et génère des tests</li>
              <li>Télécharge et push sur Git</li>
              <li>Consulte l'historique</li>
            </ul>
          </div>
        </div>
        <p style={pStyle}>Invitez des membres depuis <strong>Paramètres → Équipe</strong>. L'invité reçoit un email avec un lien valable 7 jours.</p>
      </FadeIn>
    </>
  ),
  billing: () => (
    <>
      <h1 style={h1Style}>Plans & <span style={{ color: "#2563eb" }}>facturation</span></h1>
      <p style={leadStyle}>Deux plans simples, sans surprise. L'essai gratuit de 14 jours donne accès à tout, sans carte bancaire.</p>
      <FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "20px 0 28px" }}>
          <div style={{ padding: "28px", borderRadius: "14px", border: "2px solid #e5e7eb" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Starter</div>
            <div style={{ fontSize: "36px", fontWeight: 700 }}>49€<span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 400 }}>/mois</span></div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "18px" }}>par équipe</div>
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13.5px", color: "#374151", lineHeight: 2.1 }}>
              <li>Jusqu'à 5 membres</li>
              <li>OpenAI, Azure OpenAI, Claude</li>
              <li>Analyse + génération illimitées</li>
              <li>Tests manuels</li>
              <li>Historique 30 jours</li>
            </ul>
          </div>
          <div style={{ padding: "28px", borderRadius: "14px", border: "2px solid #2563eb", background: "#eff6ff", position: "relative" }}>
            <div style={{ position: "absolute", top: "-11px", right: "16px", background: "#2563eb", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "3px 14px", borderRadius: "100px" }}>Populaire</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Pro</div>
            <div style={{ fontSize: "36px", fontWeight: 700 }}>99€<span style={{ fontSize: "16px", color: "#9ca3af", fontWeight: 400 }}>/mois</span></div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "18px" }}>par équipe</div>
            <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13.5px", color: "#374151", lineHeight: 2.1 }}>
              <li>Membres illimités</li>
              <li>Tous les providers LLM</li>
              <li>Push Git + Xray + ADO Test Plans</li>
              <li>Writeback Jira/ADO</li>
              <li>Analytics & ROI</li>
              <li>Historique 90 jours</li>
            </ul>
          </div>
        </div>
        <p style={pStyle}>Résiliation possible à tout moment depuis Paramètres → Abonnement. Les factures sont disponibles dans l'interface.</p>
      </FadeIn>
    </>
  ),
  faq: () => (
    <>
      <h1 style={h1Style}>Questions <span style={{ color: "#2563eb" }}>fréquentes</span></h1>
      <p style={leadStyle}>Les réponses aux questions qu'on nous pose le plus souvent.</p>
      {[
        { q: "Mes données sont-elles en sécurité ?", a: "Toutes les données sont hébergées en Europe (Supabase EU + Railway EU). Les tokens sont chiffrés en AES-256-GCM. Aucune donnée métier n'apparaît dans les logs. Vos données ne sont jamais utilisées pour l'entraînement de modèles IA." },
        { q: "Les tests générés fonctionnent-ils vraiment ?", a: "TestForge valide syntaxiquement chaque fichier TypeScript via le compilateur TS. En cas d'erreur, le code est corrigé automatiquement. Le taux de code compilable dépasse 95%. Les tests ne sont pas exécutés dans TestForge — vous les intégrez dans votre CI/CD." },
        { q: "Je peux utiliser TestForge uniquement pour les tests manuels ?", a: "Absolument. La génération de tests manuels structurés et le push vers Xray/ADO ont de la valeur même sans automatisation. Beaucoup d'équipes commencent par là." },
        { q: "Combien de temps prend une génération ?", a: "L'analyse d'une US : < 10 secondes. Les tests manuels : < 15 secondes. Les tests automatisés : < 30 secondes. L'analyse en lot d'un sprint de 12 US : < 60 secondes." },
        { q: "Je peux personnaliser les Page Objects générés ?", a: "Oui. Dans Paramètres → Templates POM, définissez un template (imports, classe de base, conventions). Le code généré respectera votre standard." },
        { q: "Quels frameworks de test sont supportés ?", a: "Playwright (TS, JS, Python, Java, C#), Selenium v4 (Java, Python, C#, Ruby, Kotlin), et Cypress (JS, TS). Tous génèrent du code avec le pattern POM + fixtures externalisées." },
        { q: "Mon provider LLM a accès à mes données ?", a: "Seul le contenu de l'US (titre, description, AC) est envoyé au LLM pour l'analyse et la génération. Si vous utilisez Azure OpenAI, le trafic reste dans votre tenant Azure. Si vous utilisez Ollama, rien ne quitte votre réseau." },
      ].map((item, i) => (
        <FadeIn key={i} delay={i * 0.05}>
          <details style={{ marginBottom: "8px", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <summary style={{ padding: "14px 18px", cursor: "pointer", fontWeight: 600, fontSize: "14.5px", background: "#fafbfc", listStyle: "none", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#2563eb", fontSize: "11px", transition: "transform 0.2s" }}>▸</span> {item.q}
            </summary>
            <div style={{ padding: "14px 18px", fontSize: "14.5px", color: "#4b5563", lineHeight: 1.75, borderTop: "1px solid #f3f4f6" }}>{item.a}</div>
          </details>
        </FadeIn>
      ))}
    </>
  ),
};

const h1Style = { fontSize: "32px", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.25, marginBottom: "12px" };
const h2Style = { fontSize: "20px", fontWeight: 600, letterSpacing: "-0.2px", margin: "32px 0 12px" };
const leadStyle = { fontSize: "16.5px", color: "#6b7280", lineHeight: 1.75, marginBottom: "28px", maxWidth: "580px" };
const pStyle = { color: "#4b5563", fontSize: "14.5px", lineHeight: 1.75, marginBottom: "16px" };

export function UserGuideDocs() {
  const [page, setPage] = useState("welcome");
  const [search, setSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { window.__setPage = setPage; return () => { delete window.__setPage; }; }, []);

  const filtered = search.trim()
    ? ALL_PAGES.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  const currentIdx = ALL_PAGES.findIndex((p) => p.id === page);
  const prev = currentIdx > 0 ? ALL_PAGES[currentIdx - 1] : null;
  const next = currentIdx < ALL_PAGES.length - 1 ? ALL_PAGES[currentIdx + 1] : null;

  const navItem = (p: PageItem, closeMobile = false): JSX.Element => (
    <a key={p.id} href="#" onClick={(e) => { e.preventDefault(); setPage(p.id); setSearch(""); if (closeMobile) setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "7px", fontSize: "13.5px", fontWeight: page === p.id ? 600 : 400, color: page === p.id ? "#2563eb" : "#6b7280", background: page === p.id ? "#eff6ff" : "transparent", textDecoration: "none", transition: "all 0.15s", borderLeft: page === p.id ? "3px solid #2563eb" : "3px solid transparent" }}>
      <span style={{ fontSize: "13px", width: "18px", textAlign: "center" }}>{p.icon}</span><span>{p.title}</span>
    </a>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#111827", background: "#fff", minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; } a { color: #2563eb; } a:hover { color: #1d4ed8; }
::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
@media (max-width: 860px) { .docs-sidebar { display: none !important; } .docs-main { margin-left: 0 !important; } .mobile-btn { display: flex !important; } }
details[open] summary span:first-child { transform: rotate(90deg); display: inline-block; }
code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 13px; font-family: 'JetBrains Mono', monospace; }
`}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px", padding: "12px 24px" }}>
          <button className="mobile-btn" onClick={() => setMobileNav(!mobileNav)} style={{ display: "none", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", border: "1px solid #e5e7eb", borderRadius: "7px", background: "#fff", cursor: "pointer", fontSize: "16px", flexShrink: 0 }}>☰</button>
          <a href="/" style={{ fontSize: "18px", fontWeight: 700, color: "#2563eb", textDecoration: "none", letterSpacing: "-0.5px", flexShrink: 0 }}>🔧 TestForge</a>
          <span style={{ background: "#eff6ff", color: "#2563eb", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "100px", flexShrink: 0 }}>Docs</span>
          <div style={{ flex: 1, maxWidth: "340px", position: "relative" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher dans la doc..." style={{ width: "100%", padding: "8px 14px 8px 34px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13.5px", outline: "none", background: "#f9fafb", transition: "border-color 0.15s" }} onFocus={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "#93c5fd"; }} onBlur={(e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = "#e5e7eb"; }} />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#9ca3af", pointerEvents: "none" }}>🔎</span>
            {filtered && filtered.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, overflow: "hidden" }}>
                {filtered.map((p) => (
                  <a key={p.id} href="#" onClick={(e) => { e.preventDefault(); setPage(p.id); setSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", fontSize: "13.5px", color: "#374151", textDecoration: "none", borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "#f9fafb"; }} onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "#fff"; }}>
                    <span>{p.icon}</span><span>{p.title}</span>
                  </a>
                ))}
              </div>
            )}
            {filtered && filtered.length === 0 && search.trim() && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 100, padding: "14px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
                Aucun résultat pour "{search}"
              </div>
            )}
          </div>
          <a href="/" style={{ fontSize: "13px", color: "#6b7280", textDecoration: "none", marginLeft: "auto", flexShrink: 0 }}>← Retour à l'app</a>
        </div>
      </header>

      {mobileNav && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.3)" }} onClick={() => setMobileNav(false)}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "280px", background: "#fff", padding: "20px 14px", overflowY: "auto", boxShadow: "4px 0 20px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
            {CATEGORIES.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", padding: "4px 12px", marginBottom: "4px" }}>{cat.label}</div>
                {cat.pages.map((p) => navItem(p, true))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", position: "relative" }}>
        <aside className="docs-sidebar" style={{ position: "sticky", top: "56px", width: "230px", flexShrink: 0, height: "calc(100vh - 56px)", overflowY: "auto", padding: "20px 10px 40px 20px", borderRight: "1px solid #f3f4f6" }}>
          {CATEGORIES.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#9ca3af", padding: "4px 12px", marginBottom: "4px" }}>{cat.label}</div>
              <nav style={{ display: "flex", flexDirection: "column", gap: "1px" }}>{cat.pages.map((p) => navItem(p))}</nav>
            </div>
          ))}
          <div style={{ margin: "20px 12px 0", padding: "14px", background: "#eff6ff", borderRadius: "10px", fontSize: "12px", color: "#374151", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: "3px", color: "#2563eb" }}>Besoin d'aide ?</strong>
            <a href="mailto:support@testforge.dev">support@testforge.dev</a>
          </div>
        </aside>

        <main className="docs-main" style={{ flex: 1, maxWidth: "740px", padding: "36px 48px 80px", marginLeft: "20px" }}>
          {PAGES_CONTENT[page]?.() ?? <p>Page non trouvée.</p>}

          <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
            {prev ? (
              <a href="#" onClick={(e) => { e.preventDefault(); setPage(prev.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ fontSize: "13.5px", textDecoration: "none", color: "#6b7280" }}>
                <span style={{ fontSize: "11px" }}>←</span> {prev.title}
              </a>
            ) : <span />}
            {next ? (
              <a href="#" onClick={(e) => { e.preventDefault(); setPage(next.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ fontSize: "13.5px", textDecoration: "none", color: "#2563eb", fontWeight: 500 }}>
                {next.title} <span style={{ fontSize: "11px" }}>→</span>
              </a>
            ) : <span />}
          </div>

          <div style={{ marginTop: "40px", padding: "20px 0", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <span style={{ fontSize: "12.5px", color: "#9ca3af" }}>© 2026 TestForge · Montpellier, France</span>
            <a href="mailto:support@testforge.dev" style={{ fontSize: "12.5px", textDecoration: "none" }}>support@testforge.dev</a>
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserGuideDocs;
