import React from 'react';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import PricingPage from './components/PricingPage';
import UpgradePage from './components/UpgradePage';
import ContactPage from './components/ContactPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';

// Auth-gated pages
import OnboardingPage from './components/OnboardingPage';
import UnifiedDashboard from './components/UnifiedDashboard';
import WorkspacePage from './components/workspace/WorkspacePage';
import DraftPage from './components/DraftPage';


// Admin
import MonitoringDashboard from './pages/MonitoringDashboard';

// Layout + guards
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireOnboarding, AdminGuard } from './components/ProtectedRoute';

function App() {
  return (
    <SkinProvider>
      <Router>
        <Routes>
          {/* Workspace — full screen editor, no AppHeader */}
          <Route path="/workspace" element={<Navigate to="/dashboard" replace />} />
          <Route path="/workspace/new-draft" element={<RequireOnboarding><DraftPage /></RequireOnboarding>} />
          <Route path="/workspace/premium-draft" element={<Navigate to="/dashboard" replace />} />
          <Route path="/workspace/:id" element={<RequireOnboarding><WorkspacePage /></RequireOnboarding>} />

          {/* All other routes — wrapped in AppLayout (unified header) */}
          <Route path="*" element={
            <AppLayout>
              <Routes>
                <Route path="/"        element={<LandingPage />} />
                <Route path="/en"      element={<LandingPage />} />
                <Route path="/es"      element={<LandingPage />} />
                <Route path="/fr"      element={<LandingPage />} />
                <Route path="/login"   element={<LoginPage />} />
                <Route path="/signup"  element={<SignupPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms"   element={<TermsPage />} />
                <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
                <Route path="/dashboard"  element={<RequireOnboarding><UnifiedDashboard /></RequireOnboarding>} />
                <Route path="/admin/monitoring" element={<AdminGuard><MonitoringDashboard /></AdminGuard>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </Router>
    </SkinProvider>
  );
}

export default App;
