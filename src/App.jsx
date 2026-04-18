import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import PricingPage from './components/PricingPage';
import ContactPage from './components/ContactPage';
import UpgradePage from './components/UpgradePage';

import AppLayout from './components/AppLayout';
import OnboardingPage from './components/OnboardingPage';
import UnifiedDashboard from './components/UnifiedDashboard';
import DraftPage from './components/DraftPage';
import WorkspaceDetail from './components/WorkspaceDetail';
import WorkspaceDraftEditor from './components/WorkspaceDraftEditor';
import DocumentViewer from './components/DocumentViewer';
import TeamPanel from './components/TeamPanel';
import FunderMatch from './components/FunderMatch';

import { ProtectedRoute } from './components/ProtectedRoute';
import { useUser } from './components/UserContext';

function RequireAuth({ children }) {
  const { user } = useUser() || {};
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <SkinProvider>
      <AuthProvider>
      <UserProvider>
        <Router>
          <Routes>
            {/* Public — own layout */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/upgrade" element={<UpgradePage />} />

            {/* App — AppLayout wrapper */}
            <Route path="/onboarding" element={<AppLayout><RequireAuth><OnboardingPage /></RequireAuth></AppLayout>} />
            <Route path="/dashboard" element={<AppLayout><RequireAuth><UnifiedDashboard /></RequireAuth></AppLayout>} />
            <Route path="/workspace/new-draft" element={<AppLayout><RequireAuth><WorkspaceDraftEditor /></RequireAuth></AppLayout>} />
            <Route path="/workspace/:id" element={<AppLayout><RequireAuth><WorkspaceDetail /></RequireAuth></AppLayout>} />
            <Route path="/workspace/:id/documents" element={<AppLayout><RequireAuth><DocumentViewer /></RequireAuth></AppLayout>} />
            <Route path="/workspace/team" element={<AppLayout><RequireAuth><TeamPanel /></RequireAuth></AppLayout>} />
            <Route path="/workspace/funderMatch" element={<AppLayout><RequireAuth><FunderMatch /></RequireAuth></AppLayout>} />
            <Route path="/workspace/matching" element={<AppLayout><RequireAuth><FunderMatch /></RequireAuth></AppLayout>} />
            <Route path="/workspace/scoring" element={<AppLayout><RequireAuth><ProtectedRoute feature="scoring_basic"><DraftPage /></ProtectedRoute></RequireAuth></AppLayout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </UserProvider>
      </AuthProvider>
    </SkinProvider>
  );
}

export default App;
