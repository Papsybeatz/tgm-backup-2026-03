import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import PricingPage from './components/PricingPage';
import UpgradePage from './components/UpgradePage';
import ContactPage from './components/ContactPage';

// Auth-gated pages
import OnboardingPage from './components/OnboardingPage';
import UnifiedDashboard from './components/UnifiedDashboard';
import WorkspacePage from './components/workspace/WorkspacePage';
import DraftPage from './components/DraftPage';
import PremiumWorkspace from './components/PremiumWorkspace';

// Admin
import MonitoringDashboard from './pages/MonitoringDashboard';

// Layout + guards
import AppLayout from './components/AppLayout';
import { RequireAuth, RequireOnboarding } from './components/ProtectedRoute';

function App() {
  return (
    <SkinProvider>
      <UserProvider>
        <Router>
          <AppLayout>
            <Routes>
              {/* ── Public ── */}
              <Route path="/"        element={<LandingPage />} />
              <Route path="/en"      element={<LandingPage />} />
              <Route path="/es"      element={<LandingPage />} />
              <Route path="/fr"      element={<LandingPage />} />
              <Route path="/login"   element={<LoginPage />} />
              <Route path="/signup"  element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* ── Requires login only (onboarding itself) ── */}
              <Route path="/onboarding" element={
                <RequireAuth>
                  <OnboardingPage />
                </RequireAuth>
              } />

              {/* ── Requires login + onboarding complete ── */}
              <Route path="/dashboard" element={
                <RequireOnboarding>
                  <UnifiedDashboard />
                </RequireOnboarding>
              } />

              {/* /workspace with no ID → back to dashboard where drafts list lives */}
              <Route path="/workspace" element={<Navigate to="/dashboard" replace />} />

              <Route path="/workspace/:id" element={
                <RequireOnboarding>
                  <WorkspacePage />
                </RequireOnboarding>
              } />

              <Route path="/workspace/new-draft" element={
                <RequireOnboarding>
                  <DraftPage />
                </RequireOnboarding>
              } />

              <Route path="/workspace/premium-draft" element={
                <RequireOnboarding>
                  <PremiumWorkspace />
                </RequireOnboarding>
              } />

              {/* ── Admin ── */}
              <Route path="/admin/monitoring" element={
                <RequireAuth>
                  <MonitoringDashboard />
                </RequireAuth>
              } />

              {/* ── Fallback ── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </Router>
      </UserProvider>
    </SkinProvider>
  );
}

export default App;
