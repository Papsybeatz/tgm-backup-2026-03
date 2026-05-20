import { useState } from 'react';

/**
 * useStripeCheckout
 *
 * Calls /api/checkout/create-session with the given priceId,
 * then redirects the browser to the Stripe-hosted checkout URL.
 *
 * Usage:
 *   const { startCheckout, loading, error } = useStripeCheckout();
 *   <button onClick={() => startCheckout(priceId)} disabled={loading}>
 *     {loading ? 'Redirecting...' : 'Upgrade'}
 *   </button>
 */
export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function startCheckout(priceId) {
    if (!priceId) { setError('No price selected'); return; }
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res   = await fetch('/api/checkout/create-session', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to Stripe hosted checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
    // Don't setLoading(false) on success — page is navigating away
  }

  return { startCheckout, loading, error };
}
