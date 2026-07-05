import { useState } from 'react';
import AppHeader from './AppHeader';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';
import { useUser } from './UserContext';

export function AppLayout({ children }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { user } = useUser() || {};
  const tier = user?.tier || 'free';
  const showAssistant = !user || tier !== 'free';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f9fafb)', color: 'var(--text, #111827)' }}>
      <AppHeader />
      <main>{children}</main>
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
