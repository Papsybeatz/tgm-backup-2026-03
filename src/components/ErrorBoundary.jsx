import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    if (typeof window !== 'undefined' && window.console) {
      window.console.error('ErrorBoundary caught an error', error, errorInfo);
    }
    // Expose error to self-healing loop
    if (typeof window !== 'undefined') {
      window.__REACT_ERROR__ = { error, errorInfo };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ borderColor: '#DC2626', margin: 'var(--space-lg)' }}>
          <div className="card-header text-error">Something went wrong — attempting auto-repair…</div>
          <div className="card-body">
            <pre className="text-sm text-muted">{this.state.error && this.state.error.toString()}</pre>
            <pre className="text-sm text-muted">{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
