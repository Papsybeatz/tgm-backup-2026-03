import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error };

export class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[FrontendGuardian] Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
          <h1>Something went wrong.</h1>
          <p>The interface hit an unexpected error.</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
