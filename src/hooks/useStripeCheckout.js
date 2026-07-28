import { useState, useEffect } from 'react';

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted || document.visibilityState === 'visible') {
        setLoading(false);
        setError(null);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setLoading(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  async function startCheckout(priceId, options = {}) {
    if (!priceId) {
      setError('No price selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const publicCheckout = options.publicCheckout === true;
      const token = localStorage.getItem('token');
      const successPath = typeof options.successPath === 'string' ? options.successPath : '/billing/processing';
      const cancelPath = typeof options.cancelPath === 'string' ? options.cancelPath : '/pricing';
      const checkoutContext = typeof options.checkoutContext === 'string' ? options.checkoutContext : 'app';
      const loginRedirectPath =
        typeof options.loginRedirectPath === 'string' ? options.loginRedirectPath : window.location.pathname;
      const loginRedirect = encodeURIComponent(loginRedirectPath);

      if (!publicCheckout && !token) {
        window.location.href = `/login?redirect=${loginRedirect}`;
        return;
      }

      const endpoint = publicCheckout ? '/api/checkout/create-funder-session' : '/api/checkout/create-session';
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ priceId, successPath, cancelPath, checkoutContext }),
      });

      const data = await res.json();

      if (!publicCheckout && res.status === 401) {
        window.location.href = `/login?redirect=${loginRedirect}`;
        return;
      }

      if (!res.ok) {
        const detail = data.reason ? `${data.reason}${data.code ? ` [${data.code}]` : ''}` : null;
        throw new Error(detail || data.error || 'Checkout failed');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return { startCheckout, loading, error };
}
