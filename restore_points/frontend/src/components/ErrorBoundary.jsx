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
        <div style={{ background: 'red', color: 'white', padding: '1rem' }}>
          <h2>Something went wrong — attempting auto-repair…</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
