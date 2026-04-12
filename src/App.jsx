import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ContextDebug from './components/ContextDebug';

import LandingPage from './components/LandingPage';
import PricingPage from './components/PricingPage';
import SignupPage from './components/SignupPage';
import OnboardingPage from './components/OnboardingPage';
import UpgradePage from './components/UpgradePage';
import RequestAccessPage from './components/RequestAccessPage';
import ContactSalesPage from './components/ContactSalesPage';
import ContactPage from './components/ContactPage';
import TeamAddPage from './components/TeamAddPage';
import TeamRemovePage from './components/TeamRemovePage';


import StarterDashboard from './components/StarterDashboard';
import FreeDashboard from './components/FreeDashboard';
import ProDashboard from './components/ProDashboard';
import AgencyPricingPage from './components/AgencyPricingPage';
import AgencyStarterDashboard from './components/AgencyStarterDashboard';
import AgencyUnlimitedDashboard from './components/AgencyUnlimitedDashboard';
import AgencyDashboard from './components/AgencyDashboard';
import LoginPage from './components/LoginPage';
import FounderAuditDashboard from './pages/FounderAuditDashboard.jsx';
import FreeDraftEditor from './components/FreeDraftEditor';
import StarterDraftEditor from './components/StarterDraftEditor';
import DraftEditor from './components/DraftEditor';
import ProDraftEditor from './components/ProDraftEditor';
import PremiumWorkspace from './components/PremiumWorkspace';
import PremiumDraftPage from './components/PremiumDraftPage';
import DraftPage from './components/DraftPage';
import AdminDashboard from './components/AdminDashboard';
import AdminLogsViewer from './components/AdminLogsViewer';
import LifetimeDashboard from './components/LifetimeDashboard';
import AppLayout from './components/AppLayout';
import DashboardRedirect from './components/DashboardRedirect';

function App() {
  return (
    <SkinProvider>
      <UserProvider>
        <Router>
          <AppLayout>
            <Routes>
            <Route path="/context-debug" element={<ContextDebug />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/en" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/upgrade/starter" element={<UpgradePage />} />
            <Route path="/dashboard/starter" element={<StarterDashboard />} />
            <Route path="/dashboard/pro" element={<ProDashboard />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/agency-starter" element={<AgencyStarterDashboard />} />
            <Route path="/dashboard/agency-unlimited" element={<AgencyUnlimitedDashboard />} />
            <Route path="/dashboard/agency" element={<AgencyDashboard />} />
            <Route path="/dashboard/free" element={<FreeDashboard />} />
            <Route path="/dashboard/lifetime" element={<LifetimeDashboard />} />
            <Route path="/agency/pricing" element={<AgencyPricingPage />} />
            <Route path="/request/pro" element={<RequestAccessPage />} />
            <Route path="/contact/agency" element={<ContactSalesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route path="/team/add" element={<TeamAddPage />} />
            <Route path="/team/remove" element={<TeamRemovePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/workspace/free-draft" element={<FreeDraftEditor />} />
            <Route path="/workspace/starter-draft" element={<StarterDraftEditor />} />
            <Route path="/draft" element={<DraftEditor />} />
            <Route path="/workspace/pro-draft" element={<ProDraftEditor />} />
            <Route path="/workspace/new-draft" element={<DraftPage />} />
            <Route path="/workspace/premium" element={<PremiumWorkspace />} />
            <Route path="/workspace/premium-draft" element={<PremiumDraftPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/logs" element={<AdminLogsViewer />} />
            <Route path="/founder/audit" element={<FounderAuditDashboard />} />
            </Routes>
          </AppLayout>
        </Router>
      </UserProvider>
    </SkinProvider>
  );
}

export default App;
