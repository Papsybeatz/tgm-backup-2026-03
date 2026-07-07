import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';
import { useUser } from './UserContext';

export function AppLayout({ children }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const location = useLocation();
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const showAssistant = !user || tier !== 'free';
  const showWorkspaceFooter = Boolean(
    user &&
    !location.pathname.startsWith('/workspace') &&
    (location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/clients') ||
      location.pathname.startsWith('/scott'))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f9fafb)', color: 'var(--text, #111827)' }}>
      <AppHeader />
      <main>{children}</main>
      {showWorkspaceFooter && (
        <footer className="border-t border-[#E2E8F0] bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} GrantsMaster</p>
            <div className="flex items-center gap-4">
              <Link to="/plans" className="text-gray-500 no-underline transition hover:text-[#003A8C]">Pricing</Link>
              <span aria-hidden="true">|</span>
              <Link to="/terms" className="text-gray-500 no-underline transition hover:text-[#003A8C]">Terms</Link>
              <span aria-hidden="true">|</span>
              <Link to="/privacy" className="text-gray-500 no-underline transition hover:text-[#003A8C]">Privacy</Link>
            </div>
          </div>
        </footer>
      )}
      {showAssistant && (
        <>
          <AssistantChatPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
          <AssistantChatButton open={assistantOpen} onClick={() => setAssistantOpen((open) => !open)} />
        </>
      )}
    </div>
  );
}

export default AppLayout;
