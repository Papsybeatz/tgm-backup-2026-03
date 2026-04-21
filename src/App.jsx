import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import UnifiedDashboard from './components/UnifiedDashboard';
import DashboardRedirect from './components/DashboardRedirect';
import DraftPage from './components/DraftPage';
import PremiumWorkspace from './components/PremiumWorkspace';
import PricingPage from './components/PricingPage';
import UpgradePage from './components/UpgradePage';
import OnboardingPage from './components/OnboardingPage';
import AppLayout from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import MonitoringDashboard from './pages/MonitoringDashboard';

function App() {
  return (
    <SkinProvider>
      <UserProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/en" element={<LandingPage />} />
              <Route path="/es" element={<LandingPage />} />
              <Route path="/fr" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<OnboardingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/dashboard" element={<UnifiedDashboard />} />
              <Route path="/workspace/new-draft" element={<DraftPage />} />
              <Route path="/workspace/premium-draft" element={<PremiumWorkspace />} />
<Route path="/admin/monitoring" element={<MonitoringDashboard />} />
            </Routes>
          </AppLayout>
        </Router>
      </UserProvider>
    </SkinProvider>
  );
}

export default App;
