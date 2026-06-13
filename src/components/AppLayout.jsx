import { useState } from 'react';
import AppHeader from './AppHeader';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';

export function AppLayout({ children }) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f9fafb)', color: 'var(--text, #111827)' }}>
      <AppHeader />
      <main>{children}</main>
      <AssistantChatPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      <AssistantChatButton open={assistantOpen} onClick={() => setAssistantOpen((open) => !open)} />
    </div>
  );
}

export default AppLayout;
