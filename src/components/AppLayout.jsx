import AppHeader from './AppHeader';

export function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f9fafb)', color: 'var(--text, #111827)' }}>
      <AppHeader />
      <main>{children}</main>
    </div>
  );
}

export default AppLayout;
