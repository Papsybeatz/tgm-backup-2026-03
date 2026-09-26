/**
 * SteveErrorBoundary — the counter must never be able to take down the
 * dashboard. If anything inside throws, we swallow it and render nothing (or a
 * supplied fallback), leaving the rest of the page intact.
 */
import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: () => void;
};

type State = { hasError: boolean };

export default class SteveErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Steve] counter error (contained):', error, info?.componentStack);
    try {
      this.props.onError?.();
    } catch {
      /* never let the handler itself throw */
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
