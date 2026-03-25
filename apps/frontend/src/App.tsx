import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { InvitePage } from './pages/InvitePage.js';
import { StoriesPage } from './pages/StoriesPage.js';
import { StoryDetailPage } from './pages/StoryDetailPage.js';
import { ConnectionsPage } from './pages/ConnectionsPage.js';
import { LLMConfigPage } from './pages/LLMConfigPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { TeamPage } from './pages/TeamPage.js';
import { BillingPage } from './pages/BillingPage.js';
import { GitConfigPage } from './pages/GitConfigPage.js';
import { PomTemplatesPage } from './pages/PomTemplatesPage.js';
import { SuperAdminPage } from './pages/SuperAdminPage.js';

function ProtectedRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/stories/:id" element={<StoryDetailPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings/connections" element={<ConnectionsPage />} />
        <Route path="/settings/llm" element={<LLMConfigPage />} />
        <Route path="/settings/team" element={<TeamPage />} />
        <Route path="/settings/billing" element={<BillingPage />} />
        <Route path="/settings/git" element={<GitConfigPage />} />
        <Route path="/settings/pom-templates" element={<PomTemplatesPage />} />
        <Route path="/settings" element={<Navigate to="/settings/connections" replace />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />
        <Route path="*" element={<Navigate to="/stories" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing page publique */}
      <Route path="/" element={session ? <Navigate to="/stories" replace /> : <LandingPage />} />
      <Route path="/login" element={session ? <Navigate to="/stories" replace /> : <LoginPage />} />
      <Route path="/register" element={session ? <Navigate to="/stories" replace /> : <RegisterPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      {/* Routes protégées — redirige vers la landing si pas connecté */}
      <Route path="*" element={session ? <ProtectedRoutes /> : <Navigate to="/" replace />} />
    </Routes>
  );
}
