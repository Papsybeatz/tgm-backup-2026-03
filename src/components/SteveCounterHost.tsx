/**
 * SteveCounterHost — mounts the dashboard counter above the existing dashboard.
 *
 * The dashboard itself is left completely untouched: this only prepends the
 * counter. Set `VITE_STEVE_MODE=legacy` or append `?steve=legacy` to drop back
 * to the original dashboard with no counter.
 */
import React from 'react';
import { useUser } from './UserContext';
import { resolveSteveMode } from './steveMode';
import SteveCounter from './steve/SteveCounter';
import SteveErrorBoundary from './steve/SteveErrorBoundary';

export default function SteveCounterHost({ children }: { children: React.ReactNode }) {
  const { user } = useUser() || {};
  const fusionEnabled = resolveSteveMode() !== 'legacy';
  const showCounter = Boolean(user?.email) && fusionEnabled;

  if (!showCounter) return <>{children}</>;

  return (
    <>
      {/* If the counter throws, the dashboard below still renders normally. */}
      <SteveErrorBoundary>
        <SteveCounter />
      </SteveErrorBoundary>
      {children}
    </>
  );
}
