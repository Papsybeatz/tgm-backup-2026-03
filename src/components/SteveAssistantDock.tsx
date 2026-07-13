import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';

export default function SteveAssistantDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useUser() || {};

  const assistantMode = useMemo(() => {
    if (location.pathname.startsWith('/workspace')) return 'drafting';
    if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/clients')) return 'guide';
    return 'guide';
  }, [location.pathname]);

  const isProductRoute = useMemo(
    () => ['/dashboard', '/workspace', '/clients'].some((base) => location.pathname.startsWith(base)),
    [location.pathname]
  );
  const isAuthenticated = Boolean(user?.email);
  const shouldRender = isAuthenticated && isProductRoute;

  useEffect(() => {
    if (!shouldRender && open) setOpen(false);
  }, [shouldRender, open]);

  if (!shouldRender) return null;

  return (
    <>
      <AssistantChatPanel open={open} onClose={() => setOpen(false)} mode={assistantMode} />
      <AssistantChatButton open={open} onClick={() => setOpen((current) => !current)} />
    </>
  );
}
