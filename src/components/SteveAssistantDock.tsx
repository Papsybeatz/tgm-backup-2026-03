import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from './UserContext';
import AssistantChatButton from './AssistantChatButton';
import AssistantChatPanel from './AssistantChatPanel';
import AssistantChatPanelLegacy from './AssistantChatPanelLegacy';
import { resolveSteveMode } from './steveMode';

/**
 * The floating Steve dock.
 *
 * Renders the new concierge panel by default. The original assistant panel is
 * kept as a live fallback and can be selected with `?steve=legacy` (sticky) or
 * `VITE_STEVE_MODE=legacy` — no code revert required.
 */
export default function SteveAssistantDock() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useUser() || {};

  const steveMode = useMemo(() => resolveSteveMode(), [location.search]);

  const assistantMode = useMemo(() => {
    if (location.pathname.startsWith('/workspace')) return 'drafting';
    if (location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/clients')) return 'guide';
    return 'guide';
  }, [location.pathname]);

  const isProductRoute = useMemo(
    () => ['/dashboard', '/workspace', '/clients'].some((base) => location.pathname.startsWith(base)),
    [location.pathname],
  );
  const isAuthenticated = Boolean(user?.email);

  // On the dashboard the inline counter IS Steve, so the floating dock would
  // be a second, competing Steve. The dock still follows you on the workspace
  // and clients pages.
  const counterOwnsDashboard = steveMode !== 'legacy' && location.pathname.startsWith('/dashboard');

  const shouldRender = isAuthenticated && isProductRoute && !counterOwnsDashboard;

  useEffect(() => {
    if (!shouldRender && open) setOpen(false);
  }, [shouldRender, open]);

  if (!shouldRender) return null;

  const Panel = steveMode === 'legacy' ? AssistantChatPanelLegacy : AssistantChatPanel;

  return (
    <>
      <Panel open={open} onClose={() => setOpen(false)} mode={assistantMode} />
      <AssistantChatButton open={open} onClick={() => setOpen((current) => !current)} />
    </>
  );
}
