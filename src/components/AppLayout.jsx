import { useUser } from '../hooks/useUser';
import AppHeader from './AppHeader';

export function AppLayout({ children }) {
  const { user, loading } = useUser();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #f9fafb)',
      color: 'var(--text, #111827)'
    }}>
      <AppHeader user={user} loading={loading} />
      <main style={{ minHeight: 'calc(100vh - 56px)' }}>{children}</main>
    </div>
  );
}

export default AppLayout;