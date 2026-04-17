import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages & layouts
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import OnboardingPage from './components/OnboardingPage';
import PricingPage from './components/PricingPage';
import ContactPage from './components/ContactPage';
import UpgradePage from './components/UpgradePage';
import AppLayout from './components/AppLayout';

// Dashboard
import UnifiedDashboard from './components/UnifiedDashboard';

// Workspace tools
import DraftPage from './components/DraftPage';

// Auth & tier guards
import { ProtectedRoute } from './components/ProtectedRoute';
import { useUser } from './components/UserContext';

// Auth guard: redirect to /login if not authenticated
function RequireAuth({ children }) {
  const { user } = useUser() || {};
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <SkinProvider>
      <UserProvider>
        <Router>
          <AppLayout>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />

              {/* Onboarding — auth required */}
              <Route path="/onboarding" element={
                <RequireAuth><OnboardingPage /></RequireAuth>
              } />

              {/* Dashboard — auth required, tier-driven via UnifiedDashboard */}
              <Route path="/dashboard" element={
                <RequireAuth><UnifiedDashboard /></RequireAuth>
              } />

              {/* Workspace: draft — all authenticated users */}
              <Route path="/workspace/new-draft" element={
                <RequireAuth><DraftPage /></RequireAuth>
              } />

              {/* Workspace: matching — pro+ only */}
              <Route path="/workspace/matching" element={
                <RequireAuth>
                  <ProtectedRoute feature="matching_engine">
                    <DraftPage />
                  </ProtectedRoute>
                </RequireAuth>
              } />

              {/* Workspace: scoring — starter+ only */}
              <Route path="/workspace/scoring" element={
                <RequireAuth>
                  <ProtectedRoute feature="scoring_basic">
                    <DraftPage />
                  </ProtectedRoute>
                </RequireAuth>
              } />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </Router>
      </UserProvider>
    </SkinProvider>
  );
}

export default App;
