export function loadStripeScript(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Not in browser'));
    if (window.Stripe) return resolve(window.Stripe);

    const existing = document.querySelector('script[data-stripe-loader]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Stripe) return resolve(window.Stripe);
        return reject(new Error('Stripe loaded but not available'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load Stripe script')));
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('src', 'https://js.stripe.com/v3/');
    script.setAttribute('data-stripe-loader', 'true');
    script.async = true;
    const timer = setTimeout(() => {
      script.onerror = null;
      script.onload = null;
      reject(new Error('Stripe script load timeout'));
    }, timeout);

    script.onload = () => {
      clearTimeout(timer);
      if (window.Stripe) resolve(window.Stripe);
      else reject(new Error('Stripe loaded but window.Stripe is undefined'));
    };
    script.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error('Failed to load Stripe script'));
    };

    document.head.appendChild(script);
  });
}
