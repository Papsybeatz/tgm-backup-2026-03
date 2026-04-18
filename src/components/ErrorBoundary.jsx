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
        <div style={{ padding: '2rem', margin: '2rem', background: '#fee2e2', border: '2px solid #dc2626', borderRadius: '8px', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#dc2626', marginTop: 0 }}>App Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#7f1d1d', fontSize: '13px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#991b1b', fontSize: '12px' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
