import React from 'react';
import { UserProvider } from './components/UserContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import ContextDebug from './components/ContextDebug';

import LandingPage from './components/LandingPage';
import LanguageSelector from './components/LanguageSelector';
import PricingPage from './components/PricingPage';
import SignupPage from './components/SignupPage';
import UpgradePage from './components/UpgradePage';
import RequestAccessPage from './components/RequestAccessPage';
import ContactSalesPage from './components/ContactSalesPage';
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
import AdminDashboard from './components/AdminDashboard';
import AdminLogsViewer from './components/AdminLogsViewer';

function App() {
  return (
    <UserProvider>
      <LanguageSelector />
      <Router>
        <Routes>
          <Route path="/context-debug" element={<ContextDebug />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/upgrade/starter" element={<UpgradePage />} />
          <Route path="/dashboard/starter" element={<StarterDashboard />} />
          <Route path="/dashboard/pro" element={<ProDashboard />} />
          <Route path="/dashboard/agency-starter" element={<AgencyStarterDashboard />} />
          <Route path="/dashboard/agency-unlimited" element={<AgencyUnlimitedDashboard />} />
          <Route path="/dashboard/agency" element={<AgencyDashboard />} />
          <Route path="/dashboard/free" element={<FreeDashboard />} />
          <Route path="/agency/pricing" element={<AgencyPricingPage />} />
          <Route path="/request/pro" element={<RequestAccessPage />} />
          <Route path="/contact/agency" element={<ContactSalesPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/team/add" element={<TeamAddPage />} />
          <Route path="/team/remove" element={<TeamRemovePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/workspace/free-draft" element={<FreeDraftEditor />} />
          <Route path="/workspace/starter-draft" element={<StarterDraftEditor />} />
          <Route path="/draft" element={<DraftEditor />} />
          <Route path="/workspace/pro-draft" element={<ProDraftEditor />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/logs" element={<AdminLogsViewer />} />
          <Route path="/founder/audit" element={<FounderAuditDashboard />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
