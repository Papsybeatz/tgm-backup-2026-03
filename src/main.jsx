import React from 'react';
import './i18n';
import { UserProvider } from './components/UserContext';
import { AuthProvider } from './context/AuthContext';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initAnalytics } from './lib/analytics';

const queryClient = new QueryClient();

// No-op unless VITE_POSTHOG_KEY is set at build time. Autocapture and session
// recording stay off — see the note in lib/analytics.js.
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
