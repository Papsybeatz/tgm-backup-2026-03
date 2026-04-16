import React from 'react';
import { UserProvider } from './components/UserContext';
import { SkinProvider } from './hooks/useSkin.jsx';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import UnifiedDashboard from './components/UnifiedDashboard';
import DashboardRedirect from './components/DashboardRedirect';
import DraftPage from './components/DraftPage';
import AppLayout from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <SkinProvider>
      <UserProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />
              <Route path="/workspace/new-draft" element={<DraftPage />} />
            </Routes>
          </AppLayout>
        </Router>
      </UserProvider>
    </SkinProvider>
  );
}

export default App;
