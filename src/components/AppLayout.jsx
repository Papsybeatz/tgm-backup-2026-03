import { useUser } from './UserContext';
import AppHeader from './AppHeader';
import { useLocation } from 'react-router-dom';

// Routes that have their own header — don't render AppHeader on these
const NO_HEADER_ROUTES = ['/dashboard', '/workspace', '/admin', '/onboarding'];

export function AppLayout({ children }) {
  const { user } = useUser();
  const location = useLocation();

  const hideHeader = NO_HEADER_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #f9fafb)',
      color: 'var(--text, #111827)'
    }}>
      {!hideHeader && <AppHeader user={user} loading={false} />}
      <main style={{ minHeight: hideHeader ? '100vh' : 'calc(100vh - 56px)' }}>{children}</main>
    </div>
  );
}

export default AppLayout;